RELEASE=24.04.2
AWS_DEFAULT_REGION := us-east-1
AWS_ACCT_NR=100225593120
REG=${AWS_ACCT_NR}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com
TAG_NAME?=main

.PHONY: build-% clean registry-docker-login run-%

clean:
	@rm -f nextflow.sh
	@rm -rf pipeline-results/
	@rm -rf .nextflow*
	@rm -rf work/

registry-docker-login:
ifneq ($(shell echo ${REG} | egrep "ecr\..+\.amazonaws\.com"),)
	@$(eval DOCKER_LOGIN_CMD=docker run --rm -it -v ~/.aws:/root/.aws amazon/aws-cli)
ifneq (${AWS_PROFILE},)
	@$(eval DOCKER_LOGIN_CMD=${DOCKER_LOGIN_CMD} --profile ${AWS_PROFILE})
endif
	@$(eval DOCKER_LOGIN_CMD=${DOCKER_LOGIN_CMD} ecr get-login-password --region=${AWS_DEFAULT_REGION} | docker login -u AWS --password-stdin https://${REG})
	${DOCKER_LOGIN_CMD}
endif

nextflow.sh:
	curl -L https://github.com/nextflow-io/nextflow/releases/download/v${RELEASE}/nextflow-${RELEASE}-all -o nextflow.sh
	chmod u+x nextflow.sh

build-workflow-local-deps:
	make -C ../seq_retrieval/ container-image
	make -C ../alignment/ container-image

run-integration-test-local: nextflow.sh
	./nextflow.sh run -profile test,local protein-msa.nf
	@diff -qs pipeline-results/alignment-output.aln ../../tests/resources/integration-test-results.aln

run-integration-test-aws: nextflow.sh
	@$(eval PUBLISH_DIR='pipeline-results_${TAG_NAME}')
	./nextflow.sh run -profile test,aws protein-msa.nf --image_tag ${TAG_NAME} --publish_dir ${PUBLISH_DIR}
	aws s3 cp s3://agr-pavi-pipeline-nextflow/main/results/${PUBLISH_DIR}/alignment-output.aln alignment-output.aln
	@diff -qs alignment-output.aln ../../tests/resources/integration-test-results.aln
