mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

EXTRA_PIP_COMPILE_ARGS ?=

.PHONY: check-% clean install install-% run-% update-%

.venv/:
	python3.12 -m venv .venv/

build:
	pip install build==1.*
# Setting SOURCE_DATE_EPOCH to commit date,
# so that build produces whl with reproducable hash given same source-code,
# resulting in reproducable builds that don't result in hash mismatches on rebuild
	REF=$$(git log -n 1 --no-merges --format=%H -- ./pavi_shared_aws/ pyproject.toml) && \
	 echo "REF: $$REF" && \
	 export SOURCE_DATE_EPOCH=$$(git show --no-patch --format=%ct $$REF) && \
	 echo "SOURCE_DATE_EPOCH: $$SOURCE_DATE_EPOCH" && \
	 python3.12 -m build
	 pip hash dist/pavi_shared_aws-0.0.0-py3-none-any.whl

install:
	cp dist/pavi_shared_aws-0.0.0-py3-none-any.whl /tmp/

clean:
	rm -rf build/ || true
	rm dist/* || true

requirements.txt:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) requirements.txt

tests/requirements.txt:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) tests/requirements.txt

update-deps-lock:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) update-python-deps-lock

update-test-deps-lock:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) update-python-test-deps-lock

update-deps-locks-all: update-deps-lock update-test-deps-lock
	@:

install-deps:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) install-python-deps

install-test-deps:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) install-python-test-deps

install-deps-update-dev: .venv/ requirements.txt
	.venv/bin/pip install -U -r requirements.txt

install-test-deps-update-dev: .venv/ tests/requirements.txt
	.venv/bin/pip install -U -r tests/requirements.txt

run-unit-tests: .venv/ install-test-deps
	.venv/bin/python -m pytest

run-unit-tests-dev: .venv/ install-test-deps
	.venv/bin/python -m pytest -v

run-type-checks: .venv/ install-test-deps
	.venv/bin/mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: .venv/ install-test-deps
	.venv/bin/flake8 ./
