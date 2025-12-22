# =============================================================================
# Import HAV data from 2PA.fa and export.csv
# =============================================================================
library(DBI)
library(RPostgres)
library(jsonlite)

# Files in this repo
fasta_file <- "2PA.fa"
csv_file <- "export.csv"

# Read DATABASE_URL from env, otherwise from repo config.json, otherwise error
db_url <- Sys.getenv("DATABASE_URL", "")
if (db_url == "") {
  # try repo config.json
  if (file.exists("config.json")) {
    cfg <- tryCatch(jsonlite::fromJSON("config.json"), error = function(e) NULL)
    if (!is.null(cfg$DATABASE_URL)) db_url <- as.character(cfg$DATABASE_URL)
  }
}
if (db_url == "") {
  stop("DATABASE_URL not set. Either export DATABASE_URL or create config.json with {\"DATABASE_URL\":\"...\"}.")
}

# Parse postgres URL. Support forms with optional password, e.g.
#  - postgres://user:pass@host:port/dbname
#  - postgres://user@host:port/dbname   (passwordless)
m <- regexec("^postgres(?:ql)?://([^:@/]+)(?::([^@/]+))?@([^:/]+):?([0-9]*)/(.+)$", db_url, perl=TRUE)
parts <- regmatches(db_url, m)[[1]]
if (length(parts) > 0) {
  user <- parts[2]
  password <- if (length(parts) >= 3 && nzchar(parts[3])) parts[3] else NULL
  host <- parts[4]
  port <- ifelse(length(parts) >= 5 && nzchar(parts[5]), as.integer(parts[5]), NA)
  dbname <- parts[6]
} else {
  # Try socket-style URL: postgres://user[:pass]@/dbname
  m2 <- regexec("^postgres(?:ql)?://([^:@/]+)(?::([^@/]+))?@/(.+)$", db_url, perl=TRUE)
  parts2 <- regmatches(db_url, m2)[[1]]
  if (length(parts2) > 0) {
    user <- parts2[2]
    password <- if (length(parts2) >= 3 && nzchar(parts2[3])) parts2[3] else NULL
    host <- NA
    port <- NA
    dbname <- parts2[4]
  } else {
    # Try no-user, no-host: postgres:///dbname -> use current system user
    m3 <- regexec("^postgres(?:ql)?:///(.+)$", db_url, perl=TRUE)
    parts3 <- regmatches(db_url, m3)[[1]]
    if (length(parts3) > 0) {
      user <- Sys.getenv("USER")
      password <- NULL
      host <- NA
      port <- NA
      dbname <- parts3[2]
    } else {
      stop("DATABASE_URL not in expected format")
    }
  }
}

cat("Connecting to Postgres...\n")
# Normalize optional connection params: convert NA to NULL so dbConnect omits them
normalize_param <- function(x) {
  if (is.null(x)) return(NULL)
  if (length(x) == 1 && is.na(x)) return(NULL)
  if (is.character(x) && nzchar(x) == FALSE) return(NULL)
  return(x)
}
host <- normalize_param(host)
port <- normalize_param(port)
password <- normalize_param(password)

con <- dbConnect(RPostgres::Postgres(), dbname = dbname, host = host, user = user, password = password, port = port)

cat("Reading FASTA file...\n")
fasta_lines <- readLines(fasta_file, encoding = "latin1", warn = FALSE)

records <- list()
current_header <- NULL
current_seq <- ""

for (line in fasta_lines) {
  if (startsWith(line, ">")) {
    if (!is.null(current_header) && nchar(current_seq) > 0) {
      records[[length(records) + 1]] <- list(header = current_header, seq = toupper(gsub("\\s", "", current_seq)))
    }
    current_header <- sub("^>", "", line)
    current_seq <- ""
  } else {
    current_seq <- paste0(current_seq, line)
  }
}
if (!is.null(current_header) && nchar(current_seq) > 0) {
  records[[length(records) + 1]] <- list(header = current_header, seq = toupper(gsub("\\s", "", current_seq)))
}

cat("Found", length(records), "sequences in FASTA\n")

cat("Reading CSV metadata...\n")
meta <- read.csv(csv_file, sep = ";", stringsAsFactors = FALSE, fileEncoding = "latin1", na.strings = c("", "NA"))
names(meta) <- trimws(names(meta))
cat("  Found", nrow(meta), "rows in CSV. Columns:", paste(names(meta), collapse = ", "), "\n")

# Normalize keys column name possibilities
key_col <- which(tolower(names(meta)) %in% c("key", "sample id", "sampleid"))
key_name <- if (length(key_col) >= 1) names(meta)[key_col[1]] else NULL
if (!is.null(key_name)) meta[[key_name]] <- as.character(meta[[key_name]])

convert_date <- function(date_str) {
  if (is.na(date_str) || date_str == "") return(NA)
  s <- as.character(date_str)
  if (grepl("^\\d{2}\\.\\d{2}\\.\\d{4}", s)) {
    parts <- strsplit(s, "\\.")[[1]]
    return(paste(parts[3], parts[2], parts[1], sep = "-"))
  }
  return(s)
}

cat("Importing into project's Postgres DB (table: sequences)...\n")
success <- 0
errors <- 0

for (rec in records) {
  header <- rec$header
  seq <- rec$seq

  parts <- strsplit(header, "\\|")[[1]]
  gene <- if (length(parts) >= 1) parts[1] else NA
  sequence_id <- if (length(parts) >= 2) parts[2] else NA
  hdr_genotype <- if (length(parts) >= 3) parts[3] else NA
  hdr_variant <- if (length(parts) >= 4) parts[4] else NA

  accession <- strsplit(header, " ")[[1]][1]

  # Find matching metadata row by Key == sequence_id (or by Key == accession if not found)
  meta_row <- NULL
  if (!is.null(key_name)) {
    meta_row_idx <- which(meta[[key_name]] == sequence_id)
    if (length(meta_row_idx) == 0) meta_row_idx <- which(meta[[key_name]] == accession)
    if (length(meta_row_idx) > 0) meta_row <- meta[meta_row_idx[1], , drop = FALSE]
  }

  # Build values for DB columns from CSV and header
  sampling_date <- if (!is.null(meta_row) && nrow(meta_row) > 0) {
    # common header in this export is 'Sample date' (case sensitive trimmed)
    col_idx <- which(tolower(names(meta_row)) == tolower("Sample date"))
    if (length(col_idx) > 0) convert_date(meta_row[[col_idx]]) else NA
  } else NA

  country <- if (!is.null(meta_row) && nrow(meta_row) > 0) {
    col_idx <- which(tolower(names(meta_row)) == tolower("Origin"))
    if (length(col_idx) > 0) meta_row[[col_idx]] else NA
  } else NA

  genotype <- if (!is.null(meta_row) && nrow(meta_row) > 0) {
    col_idx <- which(tolower(names(meta_row)) == tolower("Genotype"))
    val <- if (length(col_idx) > 0) meta_row[[col_idx]] else NA
    if (is.na(val) || val == "") hdr_genotype else val
  } else hdr_genotype

  outbreak <- if (!is.null(meta_row) && nrow(meta_row) > 0) {
    col_idx <- which(tolower(names(meta_row)) == tolower("OUTBREAK_VARIANT"))
    if (length(col_idx) > 0) meta_row[[col_idx]] else hdr_variant
  } else hdr_variant

  # Assemble metadata JSON: include raw CSV row (if any) and parsed header fields
  meta_obj <- list()
  if (!is.null(meta_row) && nrow(meta_row) > 0) {
    # Convert row to named list, skip NA values
    for (cn in names(meta_row)) {
      val <- meta_row[[cn]]
      if (!(length(val) == 1 && is.na(val))) {
        meta_obj[[cn]] <- val
      }
    }
  }
  meta_obj$gene <- if (!is.na(gene)) gene else NULL
  meta_obj$header <- header

  metadata_json <- toJSON(meta_obj, auto_unbox = TRUE, na = "null")

  # Insert into sequences table
  tryCatch({
    # Use positional $1.. placeholders and dbBind
    stmt <- dbSendStatement(con, "INSERT INTO sequences (accession, sequence, sequence_id, sampling_date, country, genotype, outbreak, metadata, filename) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)")
    dbBind(stmt, list(accession, seq, sequence_id, sampling_date, country, genotype, outbreak, metadata_json, fasta_file))
    dbClearResult(stmt)
    success <- success + 1
    if (success %% 100 == 0) cat("  Imported", success, "sequences...\n")
  }, error = function(e) {
    errors <<- errors + 1
    cat("  Error inserting", accession, "(seqid:", sequence_id, "):", e$message, "\n")
  })
}

cat("\nImport complete. Success:", success, "Errors:", errors, "\n")

# Close connection
dbDisconnect(con)

cat("Done.\n")
