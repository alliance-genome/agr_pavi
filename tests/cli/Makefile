.PHONY: install install-test run-quick run-all list capture-payload verify-alliance test help

PYTHON ?= python3.12
VENV   ?= .venv
PIP    := $(VENV)/bin/pip
CLI    := $(VENV)/bin/pavi-cli
PYTEST := $(VENV)/bin/pytest

API              ?= http://localhost:8000
ALLIANCE_API     ?= https://www.alliancegenome.org
EXAMPLE          ?= tp53-orthologs
TIMEOUT          ?= 300
JOB_UUID         ?=

help:
	@echo "Targets:"
	@echo "  make install                          create venv + install pavi-cli"
	@echo "  make install-test                     install pavi-cli + test extras (pytest)"
	@echo "  make list                             show the example catalog"
	@echo "  make verify-alliance                  catalog Alliance shape check against prod"
	@echo "  make verify-alliance-test             same, against test.alliancegenome.org"
	@echo "  pavi-cli verify-sequences --example <id> --alignment-file <aln>"
	@echo "                                        compare produced proteins vs UniProt canonical"
	@echo "  make test                             run unit tests"
	@echo "  make run-quick EXAMPLE=<id>           run one example end-to-end"
	@echo "  make run-all                          run every example, fail on first miss"
	@echo "  make capture-payload EXAMPLE=<id> JOB_UUID=<uuid>"
	@echo "                                        snapshot a known-good payload into fixtures/"
	@echo ""
	@echo "Variables: API=$(API)  ALLIANCE_API=$(ALLIANCE_API)  TIMEOUT=$(TIMEOUT)"

install: $(VENV)/bin/activate

$(VENV)/bin/activate:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -e .

install-test: install
	$(PIP) install -e ".[test]"

list: install
	$(CLI) list

run-quick: install
	$(CLI) run --example $(EXAMPLE) --api $(API) --timeout $(TIMEOUT)

run-all: install
	$(CLI) run-all --api $(API) --timeout $(TIMEOUT) --json-report run-all-report.json

capture-payload: install
	@if [ -z "$(JOB_UUID)" ]; then echo "JOB_UUID=<uuid> required" >&2; exit 2; fi
	$(CLI) capture-payload --example $(EXAMPLE) --job-uuid $(JOB_UUID)

verify-alliance: install
	$(CLI) verify-alliance --alliance-base-url $(ALLIANCE_API) --json-report verify-alliance-report.json

verify-alliance-test: install
	$(CLI) verify-alliance --alliance-base-url https://test.alliancegenome.org --json-report verify-alliance-test.json

test: install-test
	$(PYTEST) -v
