from enum import Enum


class JobStatus(Enum):
    PENDING = 0
    RUNNING = 1
    FAILED = 2
    COMPLETED = 3
