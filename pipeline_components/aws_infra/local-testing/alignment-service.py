#!/usr/bin/env python3
"""
Local MAFFT alignment service for Step Functions testing.

Accepts alignment requests via Lambda-style invocation and runs MAFFT.
"""

import json
import os
import subprocess
import sys
import tempfile
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

# Store job results
alignment_jobs = {}

DATA_DIR = os.environ.get('DATA_DIR', '/data')


class AlignmentHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Handle both Content-Length and chunked transfer encoding
        transfer_encoding = self.headers.get('Transfer-Encoding', '')
        content_length = int(self.headers.get('Content-Length', 0))

        if 'chunked' in transfer_encoding.lower():
            # Read chunked body
            body_parts = []
            while True:
                # Read chunk size line
                chunk_size_line = self.rfile.readline().decode('utf-8').strip()
                if not chunk_size_line:
                    break
                chunk_size = int(chunk_size_line, 16)
                if chunk_size == 0:
                    self.rfile.readline()  # Read trailing CRLF
                    break
                chunk_data = self.rfile.read(chunk_size).decode('utf-8')
                body_parts.append(chunk_data)
                self.rfile.readline()  # Read trailing CRLF after chunk
            body = ''.join(body_parts)
        else:
            body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ''

        try:
            request_data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            request_data = {}

        path = self.path

        print(f"[ALIGNMENT] Path: {path}", flush=True)
        print(f"[ALIGNMENT] Headers: {dict(self.headers)}", flush=True)
        print(f"[ALIGNMENT] Raw body: {body[:500] if body else 'EMPTY'}", flush=True)
        print(f"[ALIGNMENT] Request: {json.dumps(request_data, indent=2)}", flush=True)
        sys.stdout.flush()

        # Handle Lambda-style invocation from Step Functions Local
        # Path format: /2015-03-31/functions/{FunctionName}/invocations
        if '/invocations' in path or path == '/align':
            response = self.handle_align(request_data)
        elif path == '/status':
            response = self.handle_status(request_data)
        else:
            response = {"error": f"Unknown path: {path}", "status": "ERROR"}

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode('utf-8'))
        print(f"[ALIGNMENT] Response: {json.dumps(response, indent=2)}", flush=True)

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy"}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def handle_align(self, request):
        """
        Run MAFFT alignment on provided sequences.

        Expected request format:
        {
            "job_id": "job-123",
            "sequences": [
                {"id": "seq1", "sequence": "ACGT..."},
                {"id": "seq2", "sequence": "ACGT..."}
            ]
        }
        """
        job_id = request.get('job_id', str(uuid.uuid4()))

        try:
            # Create temp files for input/output
            with tempfile.NamedTemporaryFile(mode='w', suffix='.fasta', delete=False) as input_file:
                input_path = input_file.name

                if 'sequences' in request:
                    # Write sequences to FASTA format
                    for seq in request['sequences']:
                        input_file.write(f">{seq['id']}\n{seq['sequence']}\n")
                elif 'input_file' in request:
                    # Read from provided file path
                    with open(request['input_file'], 'r') as f:
                        input_file.write(f.read())
                else:
                    return {"status": "ERROR", "error": "No sequences or input_file provided"}

            output_path = os.path.join(DATA_DIR, f'alignment_{job_id}.fasta')

            # Run MAFFT
            print(f"[ALIGNMENT] Running MAFFT on {input_path}")
            result = subprocess.run(
                ['mafft', '--auto', input_path],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            if result.returncode != 0:
                return {
                    "status": "FAILED",
                    "job_id": job_id,
                    "error": result.stderr
                }

            # Save alignment output
            with open(output_path, 'w') as f:
                f.write(result.stdout)

            # Parse alignment for response
            alignment_data = self.parse_fasta(result.stdout)

            # Clean up temp file
            os.unlink(input_path)

            job_result = {
                "status": "COMPLETED",
                "job_id": job_id,
                "output_file": output_path,
                "alignment": alignment_data,
                "sequences_aligned": len(alignment_data),
                "completed_at": datetime.utcnow().isoformat() + 'Z'
            }

            alignment_jobs[job_id] = job_result
            return job_result

        except subprocess.TimeoutExpired:
            return {"status": "FAILED", "job_id": job_id, "error": "MAFFT timeout"}
        except Exception as e:
            return {"status": "FAILED", "job_id": job_id, "error": str(e)}

    def handle_status(self, request):
        job_id = request.get('job_id')
        if job_id in alignment_jobs:
            return alignment_jobs[job_id]
        return {"status": "NOT_FOUND", "job_id": job_id}

    def parse_fasta(self, fasta_content):
        """Parse FASTA content into a list of sequence records."""
        sequences = []
        current_id = None
        current_seq = []

        for line in fasta_content.strip().split('\n'):
            if line.startswith('>'):
                if current_id:
                    sequences.append({
                        "id": current_id,
                        "sequence": ''.join(current_seq)
                    })
                current_id = line[1:].strip()
                current_seq = []
            else:
                current_seq.append(line.strip())

        if current_id:
            sequences.append({
                "id": current_id,
                "sequence": ''.join(current_seq)
            })

        return sequences

    def log_message(self, format, *args):
        print(f"[ALIGNMENT HTTP] {args[0]}")


def main():
    port = int(os.environ.get('PORT', 8085))
    os.makedirs(DATA_DIR, exist_ok=True)

    server = HTTPServer(('0.0.0.0', port), AlignmentHandler)
    print(f"[ALIGNMENT] Starting MAFFT alignment service on port {port}", flush=True)
    print(f"[ALIGNMENT] Data directory: {DATA_DIR}", flush=True)
    print(f"[ALIGNMENT] Listening for Lambda-style invocations...", flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
