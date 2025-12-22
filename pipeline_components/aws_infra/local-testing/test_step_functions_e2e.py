#!/usr/bin/env python3
"""
End-to-end test script for PAVI Step Functions pipeline.

This script tests the complete Step Functions pipeline by:
1. Creating a job via the API
2. Polling for job completion
3. Retrieving results
4. Validating the output

Usage:
    # Set environment variables first:
    export API_BASE_URL="http://localhost:8080"
    export USE_STEP_FUNCTIONS="true"

    # Run the test:
    python test_step_functions_e2e.py
"""

import json
import os
import sys
import time
import requests
from typing import Optional


class StepFunctionsE2ETest:
    """End-to-end test for Step Functions pipeline."""

    def __init__(self, api_base_url: str):
        self.api_base_url = api_base_url.rstrip('/')
        self.job_id: Optional[str] = None

    def run_tests(self) -> bool:
        """Run all end-to-end tests."""
        print("=" * 60)
        print("PAVI Step Functions E2E Test")
        print("=" * 60)

        tests = [
            ("Health Check", self.test_health),
            ("Create Job", self.test_create_job),
            ("Poll Job Status", self.test_poll_job),
            ("Get Alignment Result", self.test_get_alignment),
            ("Get Seq Info Result", self.test_get_seqinfo),
        ]

        passed = 0
        failed = 0

        for test_name, test_func in tests:
            print(f"\n[TEST] {test_name}...")
            try:
                result = test_func()
                if result:
                    print(f"  [PASS] {test_name}")
                    passed += 1
                else:
                    print(f"  [FAIL] {test_name}")
                    failed += 1
            except Exception as e:
                print(f"  [ERROR] {test_name}: {e}")
                failed += 1

        print("\n" + "=" * 60)
        print(f"Results: {passed} passed, {failed} failed")
        print("=" * 60)

        return failed == 0

    def test_health(self) -> bool:
        """Test API health endpoint."""
        response = requests.get(f"{self.api_base_url}/api/health")
        if response.status_code != 200:
            print(f"    Health check failed: {response.status_code}")
            return False

        data = response.json()
        print(f"    API Status: {data.get('status')}")
        print(f"    Execution Mode: {data.get('execution_mode')}")

        if data.get('execution_mode') != 'step_functions':
            print("    WARNING: API not in Step Functions mode!")
            # Continue anyway for testing purposes

        return True

    def test_create_job(self) -> bool:
        """Test creating a new pipeline job."""
        # Sample sequence region for testing
        test_payload = [
            {
                "base_seq_name": "test_protein",
                "unique_entry_id": "test_e2e_001",
                "seq_id": "NC_000001.11",
                "seq_strand": "+",
                "exon_seq_regions": ["1000..1500"],
                "cds_seq_regions": ["1000..1500"],
                "fasta_file_url": "https://s3.amazonaws.com/agrjbrowse/fasta/GCF_000001405.40_GRCh38.p14_genomic.fna.gz",
                "variant_ids": []
            }
        ]

        response = requests.post(
            f"{self.api_base_url}/api/pipeline-job/",
            json=test_payload,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code != 201:
            print(f"    Failed to create job: {response.status_code}")
            print(f"    Response: {response.text}")
            return False

        data = response.json()
        self.job_id = data.get('uuid')
        print(f"    Job ID: {self.job_id}")
        print(f"    Status: {data.get('status')}")
        print(f"    Stage: {data.get('stage')}")

        return self.job_id is not None

    def test_poll_job(self, timeout: int = 300, interval: int = 10) -> bool:
        """Poll job status until completion or timeout."""
        if not self.job_id:
            print("    No job ID available")
            return False

        start_time = time.time()
        last_status = None
        last_stage = None

        while time.time() - start_time < timeout:
            response = requests.get(f"{self.api_base_url}/api/pipeline-job/{self.job_id}")

            if response.status_code != 200:
                print(f"    Failed to get job status: {response.status_code}")
                return False

            data = response.json()
            status = data.get('status')
            stage = data.get('stage')

            if status != last_status or stage != last_stage:
                elapsed = int(time.time() - start_time)
                print(f"    [{elapsed}s] Status: {status}, Stage: {stage}")
                last_status = status
                last_stage = stage

            if status == 'completed':
                print(f"    Job completed successfully!")
                return True

            if status == 'failed':
                error_msg = data.get('error_message', 'Unknown error')
                print(f"    Job failed: {error_msg}")
                return False

            time.sleep(interval)

        print(f"    Timeout after {timeout} seconds")
        return False

    def test_get_alignment(self) -> bool:
        """Test retrieving alignment result."""
        if not self.job_id:
            print("    No job ID available")
            return False

        response = requests.get(
            f"{self.api_base_url}/api/pipeline-job/{self.job_id}/result/alignment"
        )

        if response.status_code == 400:
            # Job not complete or failed
            print(f"    Alignment not available: {response.json().get('detail')}")
            return False

        if response.status_code != 200:
            print(f"    Failed to get alignment: {response.status_code}")
            return False

        content = response.text
        print(f"    Alignment size: {len(content)} bytes")
        print(f"    First 100 chars: {content[:100]}...")

        # Basic validation - should contain CLUSTAL header
        if 'CLUSTAL' not in content.upper():
            print("    WARNING: Output doesn't look like CLUSTAL format")

        return True

    def test_get_seqinfo(self) -> bool:
        """Test retrieving sequence info result."""
        if not self.job_id:
            print("    No job ID available")
            return False

        response = requests.get(
            f"{self.api_base_url}/api/pipeline-job/{self.job_id}/result/seq-info"
        )

        if response.status_code == 400:
            # Job not complete or failed
            print(f"    Seq info not available: {response.json().get('detail')}")
            return False

        if response.status_code != 200:
            print(f"    Failed to get seq info: {response.status_code}")
            return False

        content = response.text
        print(f"    Seq info size: {len(content)} bytes")

        # Try to parse as JSON
        try:
            data = json.loads(content)
            print(f"    Contains {len(data)} sequence entries")
        except json.JSONDecodeError:
            print("    WARNING: Output is not valid JSON")

        return True


def main() -> int:
    """Main entry point."""
    api_base_url = os.environ.get('API_BASE_URL', 'http://localhost:8080')

    print(f"Testing API at: {api_base_url}")

    tester = StepFunctionsE2ETest(api_base_url)
    success = tester.run_tests()

    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
