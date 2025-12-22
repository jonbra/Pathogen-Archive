# Troubleshooting Local PostgreSQL Setup

This guide helps diagnose issues when running the application with a local PostgreSQL database instead of Replit's Neon.

## Issue: Sequences Not Showing in Frontend

**Symptoms:**
- Web browser shows empty sequence list
- API returns `[]` (empty array)
- Browser console shows no errors
- You imported sequences but they don't appear

**Solution:**

### Step 1: Verify Your DATABASE_URL

Create `config.json` in the project root with your actual database connection string:

```json
{
  "DATABASE_URL": "postgresql://username:password@localhost:5432/database_name"
}
```

Or for local socket connection (peer auth):
```json
{
  "DATABASE_URL": "postgres:///your_database_name"
}
```

### Step 2: Check Which Database Has Your Sequences

Connect to PostgreSQL and verify:

```bash
# List all databases
psql -l

# Connect to your database
psql -d your_database_name

# Count sequences
SELECT COUNT(*) FROM sequences;

# Show first few sequences
SELECT id, accession, filename FROM sequences LIMIT 5;
```

### Step 3: Verify Server Connected to Right Database

Check the startup logs. After you create `config.json` and restart the server:

```
Initializing pg Pool with config: { database: 'your_database_name', user: 'username', host: '/var/run/postgresql' }
```

Or with network connection:
```
Initializing pg Pool with connectionString
```

### Step 4: Restart Server

After creating `config.json`:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

### Step 5: Test API Endpoint

Open browser and go to:
```
http://your_server_ip:5000/api/sequences
```

Should see JSON array of sequences, not `[]`.

## Database Connection Scenarios

### Scenario 1: Local Socket Connection (Unix Domain Socket)

**Use when:** PostgreSQL running on same Linux server, using peer authentication

**config.json:**
```json
{
  "DATABASE_URL": "postgres:///pathogen_archive"
}
```

**Automatically picks up:**
- User from `$USER` environment variable or OS username
- Host from `/var/run/postgresql` (standard location)
- Port from `$PGPORT` if set, else default 5432

**Environment variables (optional override):**
```bash
export PGUSER=postgres
export PGHOST=/var/run/postgresql
export PGPORT=5432
export PGPASSWORD=your_password  # Only if needed
```

### Scenario 2: Network Connection (TCP)

**Use when:** PostgreSQL on different machine or requires password authentication

**config.json:**
```json
{
  "DATABASE_URL": "postgresql://app_user:password@192.168.1.100:5432/virus_genomes"
}
```

**Verify connectivity:**
```bash
psql -h 192.168.1.100 -U app_user -d virus_genomes
```

### Scenario 3: Local via SSH Tunnel (from Windows)

**From Windows PowerShell with SSH tunnel running:**
```json
{
  "DATABASE_URL": "postgresql://app_user:password@localhost:5432/virus_genomes"
}
```

**Ensure tunnel is active:**
```powershell
ssh -L 5432:localhost:5432 user@server_ip
```

## Common Errors & Fixes

### "Connection refused"
- PostgreSQL not running: `sudo systemctl status postgresql`
- Wrong host: Check `$PGHOST` and PostgreSQL config `listen_addresses`
- Wrong port: Default is 5432

### "FATAL: Ident authentication failed"
- You're using socket auth but PostgreSQL doesn't trust your user
- Add to `/etc/postgresql/15/main/pg_hba.conf`:
  ```
  local   all             all                                     trust
  ```
- Then: `sudo systemctl restart postgresql`

### "password authentication failed"
- Wrong password in DATABASE_URL
- User doesn't have password set: `ALTER USER app_user WITH PASSWORD 'new_pass';`

### "database does not exist"
- Database name in URL doesn't match actual database
- Verify: `psql -l | grep your_database_name`
- Create if missing: `createdb your_database_name`

### Schema Missing (Empty Tables)

If you can connect but tables are empty or don't exist:

```bash
# Initialize schema
npm run db:push

# Check tables exist
psql -d your_database_name -c "\dt"
```

Should show:
```
       List of relations
 Schema |     Name     | Type  | Owner
--------+--------------+-------+-------
 public | analyses     | table | user
 public | sequences    | table | user
```

## Verification Checklist

- [ ] `config.json` exists with correct DATABASE_URL
- [ ] PostgreSQL service is running
- [ ] Your database exists: `psql -l | grep your_db`
- [ ] Sequences table has data: `SELECT COUNT(*) FROM sequences;`
- [ ] Server logs show successful connection
- [ ] Browser shows sequences at `http://server:5000/api/sequences`

## Import Data into Existing Database

If you imported sequences using a separate script (like R import script):

```bash
# Check sequences are in the database
psql -d pathogen_archive -c "SELECT COUNT(*) as sequence_count FROM sequences;"

# Check specific imported file
psql -d pathogen_archive -c "SELECT DISTINCT filename FROM sequences LIMIT 10;"

# Verify schema matches
psql -d pathogen_archive -c "\d sequences"
```

Expected schema:
```
                            Table "public.sequences"
     Column     |           Type           | Collation | Nullable | Default
----------------+--------------------------+-----------+----------+---------
 id             | integer                  |           | not null | nextval('sequences_id_seq'::regclass)
 accession      | text                     |           | not null |
 sequence       | text                     |           | not null |
 sequence_id    | text                     |           |          |
 sampling_date  | text                     |           |          |
 country        | text                     |           |          |
 genotype       | text                     |           |          |
 outbreak       | text                     |           |          |
 metadata       | jsonb                    |           | not null | '{}'::jsonb
 filename       | text                     |           | not null |
 created_at     | timestamp with time zone |           |          | now()
```

## Force Reconnect

If you changed DATABASE_URL but server still uses old connection:

```bash
# Kill any existing processes
ps aux | grep "node\|tsx"
kill -9 <PID>

# Clear node modules cache (optional)
rm -rf node_modules/.cache

# Restart
npm run dev
```

## Debug Mode

Enable detailed database logging:

```bash
# Start with detailed logging
DEBUG=*:database npm run dev

# Or for all logs
DEBUG=* npm run dev
```

This will show every SQL query being executed.

## Getting Help

If you're still stuck:

1. **Provide this information:**
   - Content of your `config.json` (mask passwords)
   - Output of `SELECT COUNT(*) FROM sequences;`
   - First 5 lines from server startup logs
   - Full error message from browser console (F12)

2. **Run diagnostic commands:**
   ```bash
   psql -l
   psql -d your_db -c "SELECT COUNT(*) FROM sequences;"
   psql -d your_db -c "\d sequences"
   curl http://localhost:5000/api/sequences | jq .
   ```
