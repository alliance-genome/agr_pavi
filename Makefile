LAST_MODIFIED_TIMESTAMP = $(shell find . -type f -printf '%T@\n' | sort -nr | head -1 | xargs -I £ date -d @£ -u +%Y%m%d-%H%M%S)
BRANCH_NAME = $(shell git rev-parse --abbrev-ref HEAD)
PAVI_DEPLOY_VERSION_LABEL ?= $(shell git describe --tags --dirty=-dirty_${BRANCH_NAME}_${LAST_MODIFIED_TIMESTAMP})
PAVI_CONTAINER_IMAGE_TAG ?= ${PAVI_DEPLOY_VERSION_LABEL}

print-deploy-version-label:
	@echo ${PAVI_DEPLOY_VERSION_LABEL}

# Reminder: this target requires AWS env variables (such as AWS_PROFILE) to be exported for successful execution
deploy-dev:
	make -C shared_aws_infra/ clean build install
	make -C pipeline/aws_infra/ validate deploy
#	make -C pipeline/seq_retrieval/ docker-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
#	make -C pipeline/alignment/ docker-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
#	make -C api/ docker-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
#	make -C webui/ docker-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
	make -C api/aws_infra validate-application-stack validate-environment-stack PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" \
	                                                                            PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
																				VALIDATE_ENV_STACK_NAME=PaviApiEbDevStack
	make -C api/aws_infra deploy-application PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}"
	make -C api/aws_infra deploy-environment PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" \
	                                         PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
                                             EB_ENV_CDK_STACK_NAME=PaviApiEbDevStack
	make -C webui/aws_infra validate-application-stack validate-environment-stack PAVI_API_ENV_NAME="PAVI-api-dev" \
                                                                                  PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" \
																				  PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}"
																				  VALIDATE_ENV_STACK_NAME=PaviWebUiEbDevStack
	make -C webui/aws_infra deploy-application PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}"
	make -C webui/aws_infra deploy-environment PAVI_API_ENV_NAME="PAVI-api-dev" \
                                               PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
                                               EB_ENV_CDK_STACK_NAME=PaviWebUiEbDevStack
