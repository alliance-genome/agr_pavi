.PHONY: check-venv-active check-node pip-tools clean install
SUPPORTED_NODE := ^v18\.

.venv/:
	python3.12 -m venv .venv/

build:
	pip install build==1.*
# Setting SOURCE_DATE_EPOCH to commit date,
# so that build produces whl with reproducable hash given same source-code
# ,resulting in reproducable builds that don't result in hash mismatches on rebuild
#TODO: figure out why this worked and then suddenly broke? Individual commands work but make run does not? $(shell ...)?
	REF=$$(git log -n 1 --format=%H ./) && \
	 export SOURCE_DATE_EPOCH=$$(git show --no-patch --format=%ct $$REF) && \
	 echo $$SOURCE_DATE_EPOCH && \
	 python3.12 -m build

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
	pip-compile --generate-hashes --no-strip-extras -o requirements.txt

tests/requirements.txt:
	pip-compile --generate-hashes --no-strip-extras --extra=test -o tests/requirements.txt

update-deps-lock:
	pip-compile --generate-hashes --no-strip-extras --upgrade -o requirements.txt

update-test-deps-lock:
	pip-compile --generate-hashes --no-strip-extras --extra=test --upgrade -o tests/requirements.txt

install-deps: requirements.txt
	pip install -r requirements.txt

install-test-deps: tests/requirements.txt
	pip install -r tests/requirements.txt

run-unit-tests: check-node install-test-deps
	python -m pytest

run-type-checks: install-test-deps
	mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: install-test-deps
	flake8 ./
