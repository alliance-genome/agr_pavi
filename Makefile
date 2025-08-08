mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

EXTRA_PIP_COMPILE_ARGS ?=

LAST_MODIFIED_TIMESTAMP ?= $(shell find . -type f -printf '%T@\n' | sort -nr | head -1 | xargs -I £ date -d @£ -u +%Y%m%d-%H%M%S)
BRANCH_NAME ?= $(shell git rev-parse --abbrev-ref HEAD)
PAVI_DEPLOY_VERSION_LABEL ?= $(shell git describe --tags --dirty=-dirty_${BRANCH_NAME}_${LAST_MODIFIED_TIMESTAMP})
PAVI_CONTAINER_IMAGE_TAG ?= ${PAVI_DEPLOY_VERSION_LABEL}

AWS_DEFAULT_REGION := us-east-1
AWS_ACCT_NR=100225593120
REG=${AWS_ACCT_NR}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com

# Node.js vars
NVM_CMD=. ${NVM_DIR}/nvm.sh --install && nvm
ifdef NVM_DIR
ifndef CI
NPM_EXEC=${NVM_CMD} exec npm
NPX_EXEC=${NVM_CMD} exec npx
endif
endif
ifndef NPM_EXEC
NPM_EXEC=npm
NPX_EXEC=npx
endif

.PHONY: install-% run-% update-% _vars-% _python-write-lock-file

print-deploy-version-label:
	@echo ${PAVI_DEPLOY_VERSION_LABEL}

registry-docker-login:
ifneq ($(shell echo ${REG} | egrep "ecr\..+\.amazonaws\.com"),)
	@$(eval DOCKER_LOGIN_CMD=docker run --rm -it -v ~/.aws:/root/.aws amazon/aws-cli)
ifneq (${AWS_PROFILE},)
	@$(eval DOCKER_LOGIN_CMD=${DOCKER_LOGIN_CMD} --profile ${AWS_PROFILE})
endif
	@$(eval DOCKER_LOGIN_CMD=${DOCKER_LOGIN_CMD} ecr get-login-password --region=${AWS_DEFAULT_REGION} | docker login -u AWS --password-stdin https://${REG})
	${DOCKER_LOGIN_CMD}
endif

update-install-shared-aws:
	make -C shared_aws/py_package/ clean build install
	make -C shared_aws/aws_infra/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only install-deps-update-dev
	make -C pipeline_components/aws_infra/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only install-deps-update-dev
	make -C api/aws_infra/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only install-deps-update-dev
	make -C webui/aws_infra/ update-deps-lock-shared-aws-only install-deps-update-dev

# Reminder: below validate- deploy- and destroy- targets requires AWS env variables (such as AWS_PROFILE) to be exported for successful execution

validate-dev:
	make -C pipeline_components/aws_infra/ validate deploy
	make -C api/aws_infra validate-application-stack validate-environment-stack PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" \
	                                                                            PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
																				VALIDATE_ENV_STACK_NAME=PaviApiEbDevStack
	make -C webui/aws_infra validate-application-stack validate-environment-stack PAVI_API_STACK_NAME="PaviApiEbDevStack" \
                                                                                  PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" \
																				  PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
																				  VALIDATE_ENV_STACK_NAME=PaviWebUiEbDevStack

deploy-dev:
	make -C pipeline_components/aws_infra/ validate deploy
	make -C pipeline_components/seq_retrieval/ container-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
	make -C pipeline_components/alignment/ container-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
	make -C api/ container-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
	make -C webui/ container-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
	make -C api/aws_infra deploy-application PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" ADD_CDK_ARGS="--require-approval any-change"
	make -C api/aws_infra deploy-environment PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" \
	                                         PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
                                             EB_ENV_CDK_STACK_NAME=PaviApiEbDevStack \
											 ADD_CDK_ARGS="--require-approval any-change"
	make -C webui/aws_infra deploy-application PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" ADD_CDK_ARGS="--require-approval any-change"
	make -C webui/aws_infra deploy-environment PAVI_API_STACK_NAME="PaviApiEbDevStack" \
                                               PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
                                               EB_ENV_CDK_STACK_NAME=PaviWebUiEbDevStack \
											   ADD_CDK_ARGS="--require-approval any-change"

destroy-dev:
	make -C webui/aws_infra destroy-environment EB_ENV_CDK_STACK_NAME=PaviWebUiEbDevStack
	make -C api/aws_infra destroy-environment EB_ENV_CDK_STACK_NAME=PaviApiEbDevStack

update-deps-locks-all:
	$(MAKE) -C pipeline_components/seq_retrieval/ update-deps-locks-all
	$(MAKE) -C api/ update-deps-locks-all
	$(MAKE) -C webui/ update-deps-locks-all
	$(MAKE) -C shared_aws/py_package/ update-deps-locks-all
	$(MAKE) -C shared_aws/py_package/ clean build install
	$(MAKE) -C shared_aws/aws_infra/ update-deps-locks-all
	$(MAKE) -C pipeline_components/aws_infra/ update-deps-locks-all
	$(MAKE) -C api/aws_infra/ update-deps-locks-all
	$(MAKE) -C webui/aws_infra/ update-deps-locks-all

# The following deps mgmt targets are not intended to be executed in this directory.
# They are called from Make targets in subdirectories, as they serve general purpose targets used accross all subcomponents requiring them.

## Node.js
.nvmrc:
	echo 20 > .nvmrc

install-node-deps: package-lock.json
	${NPM_EXEC} install --strict-peer-deps --omit-dev

install-node-test-deps: package-lock.json
	${NPM_EXEC} install --strict-peer-deps

install-node: .nvmrc
	${NVM_CMD} install

update-install-node: install-node
	@:

package-lock.json:
	${NPM_EXEC} install --strict-peer-deps --package-lock-only

update-node-deps-lock: package-lock.json
	${NPM_EXEC} update --strict-peer-deps --package-lock-only

_vars-node-nvm-exec:
	@echo "NVM_CMD=${NVM_CMD}"

_vars-node-npm-exec:
	@echo "NPM_EXEC=${NPM_EXEC}"

_vars-node-npx-exec:
	@echo "NPX_EXEC=${NPX_EXEC}"

## Python
.venv/:
	python3.12 -m venv .venv/

.venv-build/:
	python3.12 -m venv .venv-build/
	.venv-build/bin/pip install pip-tools==7.4.1

requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _vars-python-no-upgrade))
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _vars-python-main-deps))
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _python-write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

tests/requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _vars-python-no-upgrade))
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _vars-python-test-deps))
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _python-write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

install-python-deps: .venv/ requirements.txt
	.venv/bin/pip install -r requirements.txt

install-python-test-deps: .venv/ tests/requirements.txt
	.venv/bin/pip install -r tests/requirements.txt

update-python-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _vars-python-upgrade-all))
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _vars-python-main-deps))
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _python-write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-python-test-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _vars-python-upgrade-all))
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _vars-python-test-deps))
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _python-write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-python-deps-lock-shared-aws-only:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _vars-python-upgrade-shared-aws-only))
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _vars-python-main-deps))
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _python-write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-python-test-deps-lock-shared-aws-only:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _vars-python-upgrade-shared-aws-only))
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _vars-python-test-deps))
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/Makefile _python-write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

_vars-python-main-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=-o requirements.txt"

_vars-python-test-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--extra=test -o tests/requirements.txt"

_vars-python-no-upgrade:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--no-upgrade"

_vars-python-upgrade-all:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--upgrade"

_vars-python-upgrade-shared-aws-only:
	@echo "EXTRA_PIP_COMPILE_ARGS+=-P pavi_shared_aws"

_python-write-lock-file: .venv-build/
	.venv-build/bin/pip-compile --generate-hashes --no-strip-extras -q ${EXTRA_PIP_COMPILE_ARGS}
