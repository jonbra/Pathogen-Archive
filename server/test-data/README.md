# Test Data for Analysis Results

This directory contains example analysis result files for testing the viewer components.

## Using Test Data

You can insert these test analyses into the database using the API:

```bash
# Create an MSA analysis
curl -X POST http://localhost:5000/api/analyses/create \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Multiple Sequence Alignment",
    "parameters": {"sequenceIds": [1]},
    "status": "completed",
    "results": <copy from example-msa.json>
  }'

# Create a Phylogeny analysis
curl -X POST http://localhost:5000/api/analyses/create \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Phylogeny",
    "parameters": {"sequenceIds": [1]},
    "status": "completed",
    "results": <copy from example-phylogeny.json>
  }'
```

## File Formats

### example-msa.json
- Contains a Multiple Sequence Alignment result
- Fields:
  - `type`: "Multiple Sequence Alignment"
  - `alignmentLength`: Length of aligned sequences
  - `sequenceCount`: Number of sequences
  - `sequences`: Array of {accession, sequence}

### example-phylogeny.json
- Contains a Phylogeny analysis result
- Fields:
  - `type`: "Phylogeny"
  - `tree`: Newick format tree string
  - `sequences`: Aligned sequences (MSA from the analysis)
  - `method`: Description of the method used
  - `timestamp`: ISO timestamp

Both can be viewed in the Analysis Detail page.
