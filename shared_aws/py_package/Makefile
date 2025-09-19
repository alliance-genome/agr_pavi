mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

.PHONY: check-% clean install install-% run-% update-%

build: .venv/
	.venv/bin/pip install build==1.*
# Setting SOURCE_DATE_EPOCH to commit date,
# so that build produces whl with reproducable hash given same source-code,
# resulting in reproducable builds that don't result in hash mismatches on rebuild
	REF=$$(git log -n 1 --no-merges --format=%H -- ./pavi_shared_aws/ pyproject.toml) && \
	 echo "REF: $$REF" && \
	 export SOURCE_DATE_EPOCH=$$(git show --no-patch --format=%ct $$REF) && \
	 echo "SOURCE_DATE_EPOCH: $$SOURCE_DATE_EPOCH" && \
	 .venv/bin/python3 -m build
	 .venv/bin/pip hash dist/pavi_shared_aws-0.0.0-py3-none-any.whl

install:
	cp dist/pavi_shared_aws-0.0.0-py3-none-any.whl /tmp/

clean:
	rm -rf build/ || true
	rm dist/* || true

update-deps-lock: update-python-deps-lock

update-test-deps-lock: update-python-test-deps-lock

update-deps-locks-all: update-deps-lock update-test-deps-lock
	@:

install-deps: install-python-deps

install-test-deps: install-python-test-deps

install-deps-update-dev:
	$(MAKE) --no-print-directory update-deps-lock
	$(MAKE) --no-print-directory install-deps

install-test-deps-update-dev:
	$(MAKE) --no-print-directory update-test-deps-lock
	$(MAKE) --no-print-directory install-test-deps

run-unit-tests: .venv/ install-test-deps
	.venv/bin/python -m pytest

run-unit-tests-dev: .venv/ install-test-deps
	.venv/bin/python -m pytest -v

run-type-checks: .venv/ install-test-deps
	.venv/bin/mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: .venv/ install-test-deps
	.venv/bin/flake8 ./
