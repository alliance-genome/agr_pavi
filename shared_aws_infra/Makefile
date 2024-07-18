SUPPORTED_NODE := ^v18\.
EXTRA_PIP_COMPILE_ARGS ?=

.PHONY: check-% clean install install-% pip-tools run-% update-% _vars-% _write-lock-file

.venv/:
	python3.12 -m venv .venv/

build:
	pip install build==1.*
# Setting SOURCE_DATE_EPOCH to commit date,
# so that build produces whl with reproducable hash given same source-code,
# resulting in reproducable builds that don't result in hash mismatches on rebuild
	REF=$$(git log -n 1 --no-merges --format=%H -- ./pavi_shared_aws_infra pyproject.toml) && \
	 echo "REF: $$REF" && \
	 export SOURCE_DATE_EPOCH=$$(git show --no-patch --format=%ct $$REF) && \
	 echo "SOURCE_DATE_EPOCH: $$SOURCE_DATE_EPOCH" && \
	 python3.12 -m build
	 pip hash dist/pavi_shared_aws_infra-0.0.0-py3-none-any.whl

install:
	cp dist/pavi_shared_aws_infra-0.0.0-py3-none-any.whl /tmp/

clean:
	rm -rf build/ || true
	rm dist/* || true

check-venv-active:
ifeq ($(VIRTUAL_ENV),)
	@echo 'No active python virtual environment found.'\
		  'Please active the virtual environment first by running `source .venv/bin/activate`,'\
		  'or read README.md for instructions on how to set up a new one.'
	@exit 1
else
	@:
endif

check-node:
	@$(eval NODE_VERSION=$(shell node --version))
ifeq ($(shell node --version | grep -P "${SUPPORTED_NODE}"),)
	@echo 'Node version "${NODE_VERSION}" not supported!'\
		  'Change the active node version (use nvm) to match "${SUPPORTED_NODE}".'
	@exit 1
else
	@:
endif

pip-tools:
	pip install pip-tools==7.4.1

requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-no-upgrade))
	$(eval $(shell $(MAKE) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

tests/requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-no-upgrade))
	$(eval $(shell $(MAKE) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-upgrade-all))
	$(eval $(shell $(MAKE) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-test-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-upgrade-all))
	$(eval $(shell $(MAKE) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

install-deps: requirements.txt
	pip install -r requirements.txt

install-test-deps: tests/requirements.txt
	pip install -r tests/requirements.txt

install-deps-update-dev: requirements.txt
	pip install -U -r requirements.txt

install-test-deps-update-dev: tests/requirements.txt
	pip install -U -r tests/requirements.txt

run-unit-tests: check-node install-test-deps
	python -m pytest

run-unit-tests-dev: check-venv-active check-node install-test-deps
	python -m pytest -v

run-type-checks: install-test-deps
	mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: install-test-deps
	flake8 ./

_vars-main-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=-o requirements.txt"

_vars-test-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--extra=test -o tests/requirements.txt"

_vars-no-upgrade:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--no-upgrade"

_vars-upgrade-all:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--upgrade"

_write-lock-file:
	pip-compile --generate-hashes --no-strip-extras -q ${EXTRA_PIP_COMPILE_ARGS}
