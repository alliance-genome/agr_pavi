#!/usr/bin/env python3
"""
Mock AWS Batch server for local Step Functions testing.

This server simulates AWS Batch API responses for:
- SubmitJob
- DescribeJobs

Jobs are "completed" immediately with success status.
"""

import json
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

# Store submitted jobs
jobs = {}


class BatchMockHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')

        # Parse the action from headers
        target = self.headers.get('X-Amz-Target', '')

        try:
            request_data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            request_data = {}

        print(f"[MOCK BATCH] Target: {target}")
        print(f"[MOCK BATCH] Request: {json.dumps(request_data, indent=2)}")

        if 'SubmitJob' in target:
            response = self.handle_submit_job(request_data)
        elif 'DescribeJobs' in target:
            response = self.handle_describe_jobs(request_data)
        else:
            response = {"error": f"Unknown action: {target}"}

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode('utf-8'))
        print(f"[MOCK BATCH] Response: {json.dumps(response, indent=2)}")

    def handle_submit_job(self, request):
        job_id = str(uuid.uuid4())
        job_name = request.get('jobName', 'mock-job')
        job_queue = request.get('jobQueue', 'mock-queue')
        job_definition = request.get('jobDefinition', 'mock-definition')

        # Create job record (immediately succeeded for testing)
        job = {
            'jobArn': f'arn:aws:batch:us-east-1:123456789012:job/{job_id}',
            'jobId': job_id,
            'jobName': job_name,
            'jobQueue': job_queue,
            'jobDefinition': job_definition,
            'status': 'SUCCEEDED',
            'createdAt': int(datetime.now().timestamp() * 1000),
            'startedAt': int(datetime.now().timestamp() * 1000),
            'stoppedAt': int(datetime.now().timestamp() * 1000),
            'container': {
                'exitCode': 0,
                'logStreamName': f'pavi/mock/{job_id}'
            }
        }

        jobs[job_id] = job

        return {
            'jobArn': job['jobArn'],
            'jobId': job_id,
            'jobName': job_name
        }

    def handle_describe_jobs(self, request):
        job_ids = request.get('jobs', [])

        result_jobs = []
        for job_id in job_ids:
            if job_id in jobs:
                result_jobs.append(jobs[job_id])
            else:
                # Return a synthetic succeeded job
                result_jobs.append({
                    'jobArn': f'arn:aws:batch:us-east-1:123456789012:job/{job_id}',
                    'jobId': job_id,
                    'jobName': 'mock-job',
                    'status': 'SUCCEEDED',
                    'container': {
                        'exitCode': 0,
                        'logStreamName': f'pavi/mock/{job_id}'
                    }
                })

        return {'jobs': result_jobs}

    def log_message(self, format, *args):
        print(f"[MOCK BATCH HTTP] {args[0]}")


def main():
    port = 8084
    server = HTTPServer(('0.0.0.0', port), BatchMockHandler)
    print(f"[MOCK BATCH] Starting mock Batch server on port {port}")
    print(f"[MOCK BATCH] All jobs will complete immediately with SUCCEEDED status")
    server.serve_forever()


if __name__ == '__main__':
    main()
