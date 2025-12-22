# Hepatitis A Genome Sequence Database

A full-stack application for managing, analyzing, and exploring Hepatitis A virus genome sequences. Features include sequence upload, metadata-based search, multiple sequence alignment (MSA), and phylogenetic analysis.

## Table of Contents

- [Quick Start](#quick-start)
- [Running the Application](#running-the-application)
- [How to Use](#how-to-use)
  - [Uploading Sequences](#uploading-sequences)
  - [Preparing Metadata](#preparing-metadata)
  - [Browsing and Searching](#browsing-and-searching)
  - [Running Analyses](#running-analyses)
- [Features](#features)
- [System Requirements](#system-requirements)
- [Deployment](#deployment)
  - [Remote Linux Server](#remote-linux-server)
  - [SSH Tunnel from Windows PowerShell](#ssh-tunnel-from-windows-powershell)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database
- R and required packages (jsonlite, ggplot2)
- MAFFT (multiple sequence alignment tool)
- IQ-TREE (phylogenetic inference tool)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize the database:**
   ```bash
   npm run db:push
   ```

3. **Start the application:**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5000`.

## Running the Application

### Development Mode
```bash
npm run dev
```
This starts both the Express backend server and Vite development server. Hot reloading is enabled for both frontend and backend changes.

### Production Build
```bash
npm run build
npm run start
```

### Type Checking
```bash
npm run check
```
Validates TypeScript for both server and client code.

## How to Use

### Uploading Sequences

#### 1. Prepare Your FASTA File

Create a FASTA file with your sequences. Format:
```fasta
>accession_1
ACGTACGTACGTACGT...
>accession_2
ACGTACGTACGTACGT...
```

**Important:** The accession ID (after `>`) will be used to match with metadata rows.

#### 2. Prepare Your Metadata File

Create a CSV file with the following columns (all optional except `sequence_id`):

```csv
sequence_id,sampling_date,country,genotype,outbreak,other_field
NC_045512.2,2020.03.15,USA,B.1,2020-covid,additional_data
NC_000001.1,2020.05.20,China,B.1.1,2020-covid,more_info
```

**Column Definitions:**
- **sequence_id**: Unique identifier for the sequence (should match FASTA accession)
- **sampling_date**: Collection date in format `YYYY.MM.DD`
- **country**: Geographic origin (country name or ISO code)
- **genotype**: Viral strain or genotype classification
- **outbreak**: Associated outbreak identifier
- Additional columns are preserved but not indexed for search

**Note:** The CSV parser matches rows by checking if `sequence_id` (or `Accession`, `accession`) matches the FASTA accession ID.

#### 3. Upload via Web Interface

1. Navigate to **Upload Sequences** page
2. Click "Select FASTA File" and choose your `.fasta` or `.fa` file
3. Optionally click "Select Metadata File" and choose your `.csv` file
4. Click **Upload**
5. Confirm the number of sequences imported

#### Example Metadata File (Full)

```csv
sequence_id,sampling_date,country,genotype,outbreak
SARS-CoV-2_USA_001,2024.01.15,USA,XEC,2024-flu
SARS-CoV-2_CHN_002,2024.02.20,China,KP.2,2024-respiratory
Flu_JPN_003,2024.03.10,Japan,H3N2,2024-flu
Flu_UK_004,2024.03.15,United Kingdom,H3N2,2024-flu
```

### Browsing and Searching

#### Browse All Sequences

1. Go to **Browse Database**
2. View all uploaded sequences with:
   - Accession ID
   - Sequence length
   - Sampling date
   - Metadata fields

#### Search Sequences

Use the search filters to find specific sequences:

**Single Field Search:**
- Enter a **country** name (e.g., "USA")
- Enter a **genotype** (e.g., "B.1")
- Enter a **sampling date** (e.g., "2024.01.15")
- Enter an **outbreak ID** (e.g., "2020-covid")

**Multiple Filters:**
Combine multiple criteria (AND logic):
- Country: "USA" + Genotype: "B.1" → sequences from USA with genotype B.1

**Complete Metadata Only:**
- Enable "Show only complete sequences" → only returns sequences with ALL metadata fields populated

#### API Endpoint

Direct search via HTTP:
```
GET /api/sequences/search?country=USA&genotype=B.1&requireComplete=true
```

Query parameters:
- `sequenceId` - Filter by sequence ID
- `samplingDate` - Filter by exact date (YYYY.MM.DD)
- `country` - Filter by country
- `genotype` - Filter by genotype
- `outbreak` - Filter by outbreak
- `requireComplete=true` - Only return sequences with all metadata fields

### Running Analyses

#### Available Analyses

1. **GC Content**: Calculate GC percentage for each sequence
2. **Multiple Sequence Alignment (MSA)**: Align sequences using MAFFT
3. **Phylogeny**: Construct phylogenetic tree using MAFFT + IQ-TREE

#### Run an Analysis

1. **Browse Database** and select sequences using checkboxes
2. Click **Run Analysis**
3. Choose analysis type:
   - **GC Content** - Fast, shows GC% distribution
   - **MSA** - Medium time, outputs aligned sequences
   - **Phylogeny** - Slow, outputs Newick format tree
4. Click **Submit**

#### View Results

1. Go to **Analyses** page
2. Click on an analysis to see:
   - Analysis type and creation date
   - Status (pending, running, completed, failed)
   - Results (visualization or raw data)

**Result Types:**
- **GC Content**: Table with per-sequence GC%, mean/median
- **MSA**: Aligned sequences, alignment length, statistics
- **Phylogeny**: Newick tree file, evolutionary relationships

## Features

### Sequence Management
- Upload FASTA files with optional metadata
- Store sequences with searchable metadata fields
- Automatic sequence validation and parsing
- Bulk import capability

### Metadata Support
- Structured fields: sequence_id, sampling_date, country, genotype, outbreak
- Optional metadata (all fields except sequence_id)
- Full-text and exact match search
- Filter by single or multiple fields
- Query only complete sequences

### Analyses
- **GC Content Analysis**: Rapid assessment of nucleotide composition
- **Multiple Sequence Alignment (MAFFT)**: Professional-grade local alignment
- **Phylogenetic Inference (IQ-TREE)**: GTR+G model, rooted trees
- Background processing: analyses run asynchronously
- Result persistence: view historical analyses anytime

### Data Visualization
- Browse sequences in table format
- Search results highlighting
- Analysis result display with charts (recharts)

## System Requirements

### Runtime
- Node.js 20.x or higher
- PostgreSQL 12+ (Neon serverless)
- 2+ GB RAM recommended

### External Tools
- **MAFFT** v7+: Multiple sequence alignment
- **IQ-TREE** v2+: Phylogenetic inference
- **R** 3.6+: Optional (fallback to JavaScript for GC content if R unavailable)

### Browser
- Modern browser with ES2020+ support (Chrome, Firefox, Safari, Edge)
- WebSocket support for real-time features

## Database Schema

### sequences table
```sql
- id (serial, PK)
- accession (text, unique)
- sequence (text)
- sequence_id (text, optional)
- sampling_date (text, optional)
- country (text, optional)
- genotype (text, optional)
- outbreak (text, optional)
- metadata (jsonb)
- filename (text)
- created_at (timestamp)
```

### analyses table
```sql
- id (serial, PK)
- type (text) - 'GC Content', 'MSA', 'Phylogeny'
- parameters (jsonb)
- status (text) - 'pending', 'running', 'completed', 'failed'
- results (jsonb)
- created_at (timestamp)
```

## Troubleshooting

### Sequences Don't Show in Frontend (Empty List)

**Problem:** Web browser shows empty sequence list but you've imported sequences.

**Solution:** See [TROUBLESHOOTING_LOCAL_SETUP.md](TROUBLESHOOTING_LOCAL_SETUP.md)

**Quick fixes:**
1. Create `config.json` with your PostgreSQL connection string:
   ```json
   {
     "DATABASE_URL": "postgresql://username:password@localhost:5432/database_name"
   }
   ```

2. Restart the server:
   ```bash
   npm run dev
   ```

3. Verify sequences are in database:
   ```bash
   psql -d your_database_name -c "SELECT COUNT(*) FROM sequences;"
   ```

4. Check browser: `http://your_server:5000/api/sequences`

### Upload Fails
- Check FASTA format (accessions must start with `>`)
- Ensure CSV has proper headers
- Verify accession IDs match between FASTA and CSV

### Analysis Fails
- Check logs: `npm run dev` shows backend errors
- Ensure MAFFT/IQ-TREE installed: `which mafft` and `which iqtree`
- For large datasets (>1000 sequences), phylogeny may timeout

### Search Returns No Results
- Verify metadata was imported: check **Browse Database**
- Try removing filters one at a time
- Use `requireComplete=true` only if all sequences have metadata

### Database Issues
- **Local PostgreSQL**: Create `config.json` (see [TROUBLESHOOTING_LOCAL_SETUP.md](TROUBLESHOOTING_LOCAL_SETUP.md))
- **Replit Neon**: Check DATABASE_URL environment variable is set
- Run `npm run db:push --force` to re-sync schema

## Performance Notes

- **Upload**: ~1 second per 100 sequences
- **GC Content**: <1 second
- **MSA**: 1-10 seconds depending on sequence count/length
- **Phylogeny**: 10-60 seconds (may timeout for >500 sequences)

## Deployment

### Remote Linux Server

Deploy this application on a remote Linux server using Node.js and PostgreSQL.

#### Prerequisites on Server

1. **Ubuntu/Debian-based System**
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm postgresql postgresql-contrib
   ```

2. **Install MAFFT and IQ-TREE**
   ```bash
   sudo apt install -y mafft iqtree
   ```

3. **Verify installations:**
   ```bash
   mafft --version
   iqtree --version
   node --version
   ```

#### Step 1: Prepare the Server

1. **Create application directory:**
   ```bash
   mkdir -p ~/virus-genome-db
   cd ~/virus-genome-db
   ```

2. **Clone or upload your application code**

3. **Install dependencies:**
   ```bash
   npm install
   npm run build
   ```

#### Step 2: Set up PostgreSQL

1. **Create database and user:**
   ```bash
   sudo -u postgres psql
   ```

   In PostgreSQL shell:
   ```sql
   CREATE DATABASE virus_genomes;
   CREATE USER app_user WITH PASSWORD 'your_secure_password';
   ALTER ROLE app_user SET client_encoding TO 'utf8';
   ALTER ROLE app_user SET default_transaction_isolation TO 'read committed';
   ALTER ROLE app_user SET default_transaction_deferrable TO on;
   ALTER ROLE app_user SET default_transaction_level TO '4';
   GRANT ALL PRIVILEGES ON DATABASE virus_genomes TO app_user;
   \q
   ```

2. **Initialize database schema:**
   ```bash
   export DATABASE_URL="postgresql://app_user:your_secure_password@localhost:5432/virus_genomes"
   npm run db:push
   ```

3. **PostgreSQL must listen on localhost AND network interface:**
   ```bash
   sudo nano /etc/postgresql/15/main/postgresql.conf
   ```
   
   Find and update:
   ```
   listen_addresses = 'localhost,0.0.0.0'
   ```
   
   Then update connection settings:
   ```bash
   sudo nano /etc/postgresql/15/main/pg_hba.conf
   ```
   
   Add this line to allow tunnel connections:
   ```
   host    virus_genomes   app_user    127.0.0.1/32            md5
   ```
   
   Restart PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```

#### Step 3: Run the Application

**Option A: Manual (Development)**
```bash
export NODE_ENV=production
export DATABASE_URL="postgresql://app_user:your_secure_password@localhost:5432/virus_genomes"
npm run start
# App runs on http://your_server_ip:5000
```

**Option B: Using PM2 (Production Recommended)**

1. **Install PM2 globally:**
   ```bash
   sudo npm install -g pm2
   ```

2. **Create ecosystem config** (`ecosystem.config.js`):
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'virus-genome-db',
         script: './dist/index.cjs',
         instances: 1,
         exec_mode: 'cluster',
         env: {
           NODE_ENV: 'production',
           DATABASE_URL: 'postgresql://app_user:your_password@localhost:5432/virus_genomes'
         },
         max_memory_restart: '1G',
         error_file: './logs/err.log',
         out_file: './logs/out.log',
         log_file: './logs/combined.log',
         time_format: 'YYYY-MM-DD HH:mm:ss Z'
       }
     ]
   };
   ```

3. **Start application:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Monitor:**
   ```bash
   pm2 monit
   pm2 logs virus-genome-db
   ```

**Option C: Using systemd (Production Alternative)**

Create `/etc/systemd/system/virus-genome-db.service`:
```ini
[Unit]
Description=Virus Genome Database
After=network.target postgresql.service

[Service]
Type=simple
User=yourusername
WorkingDirectory=/home/yourusername/virus-genome-db
Environment="NODE_ENV=production"
Environment="DATABASE_URL=postgresql://app_user:password@localhost:5432/virus_genomes"
ExecStart=/usr/bin/node dist/index.cjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable virus-genome-db
sudo systemctl start virus-genome-db
systemctl status virus-genome-db
```

#### Step 4: Firewall Configuration

1. **Allow SSH and HTTP/HTTPS:**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **DO NOT expose PostgreSQL port 5432** - only access via SSH tunnel

#### Step 5: Reverse Proxy (Optional but Recommended)

Set up Nginx to proxy requests to your Node.js app (port 5000):

```bash
sudo apt install nginx
```

Create `/etc/nginx/sites-available/virus-genome`:
```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/virus-genome /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSH Tunnel from Windows PowerShell

Access your remote PostgreSQL database from your local Windows machine through an SSH tunnel, allowing you to use local database tools while the database is on the remote server.

#### Prerequisites

1. **PuTTY or native SSH** (Windows 10+ has OpenSSH):
   ```powershell
   Get-WindowsCapability -Online | Where-Object {$_.Name -like 'OpenSSH*'}
   ```
   
   If not installed:
   ```powershell
   Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
   ```

2. **SSH key or password** for your remote server

#### Setup SSH Tunnel

**Using PowerShell (Recommended):**

```powershell
# Variables
$RemoteUser = "yourusername"
$RemoteHost = "your_server_ip"
$RemotePort = 5432
$LocalPort = 5432

# Create SSH tunnel
ssh -L ${LocalPort}:localhost:${RemotePort} ${RemoteUser}@${RemoteHost}
```

**With SSH key:**
```powershell
$KeyPath = "C:\path\to\your\private_key"
ssh -i $KeyPath -L 5432:localhost:5432 yourusername@your_server_ip
```

**Run in background (as scheduled task):**

Create PowerShell script `start-tunnel.ps1`:
```powershell
$RemoteUser = "yourusername"
$RemoteHost = "your_server_ip"
$KeyPath = "C:\path\to\private_key"

# Keep tunnel alive, restart on disconnect
while ($true) {
    Write-Host "Starting SSH tunnel..."
    ssh -i $KeyPath -L 5432:localhost:5432 ${RemoteUser}@${RemoteHost}
    Write-Host "Tunnel disconnected. Reconnecting in 5 seconds..."
    Start-Sleep -Seconds 5
}
```

Run in PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File C:\path\to\start-tunnel.ps1
```

#### Connect to Database Locally

Once tunnel is established, connect using local connection:

**Connection String for Applications:**
```
postgresql://app_user:your_password@127.0.0.1:5432/virus_genomes
```

**Using psql (if installed):**
```powershell
psql -h 127.0.0.1 -U app_user -d virus_genomes
```

**Using DBeaver (GUI Database Client - Recommended):**

1. Install [DBeaver Community Edition](https://dbeaver.io/)
2. Create new PostgreSQL connection:
   - **Host:** 127.0.0.1
   - **Port:** 5432
   - **Database:** virus_genomes
   - **Username:** app_user
   - **Password:** your_password
3. Test connection (should work after tunnel is running)

**Using pgAdmin (GUI Database Admin):**

1. Install [pgAdmin](https://www.pgadmin.org/) on Windows
2. Create new server connection with same settings as above

#### Access Web Application from Windows

Once tunnel is running, the application is still accessible at:
```
http://your_server_ip:5000
```

No tunnel needed for web access - only for database access.

#### Troubleshooting SSH Tunnel

**"Connection refused" error:**
- Ensure PostgreSQL is running on server: `sudo systemctl status postgresql`
- Verify listen_addresses includes 0.0.0.0: `sudo nano /etc/postgresql/15/main/postgresql.conf`
- Check firewall on server allows postgres: `sudo ufw status`

**"Permission denied" when using SSH key:**
```powershell
# Fix key permissions (should be readable only by user)
icacls "C:\path\to\private_key" /inheritance:r /grant:r "%USERNAME%`:F"
```

**Tunnel disconnects randomly:**
- Add keep-alive options:
```powershell
ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=10 -L 5432:localhost:5432 user@host
```

**Port 5432 already in use:**
```powershell
# Use different local port
ssh -L 5433:localhost:5432 user@host
# Then connect to: 127.0.0.1:5433
```

## Support

For issues, refer to `DEVELOPMENT.md` for architecture details and extension guide.
