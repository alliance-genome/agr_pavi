"""
CDK Stack for PAVI WebUI deployment using AWS Amplify.

AWS Amplify provides optimized hosting for Next.js applications with:
- Automatic builds from GitHub
- Server-side rendering support
- Built-in CDN
- Preview environments for pull requests
- Custom domain support
"""

from aws_cdk import (
    aws_amplify_alpha as amplify,
    aws_iam as iam,
    aws_route53 as route53,
    aws_secretsmanager as secretsmanager,
    CfnOutput,
    Fn as CfnFn,
    RemovalPolicy,
    SecretValue,
    Stack,
    Tags as cdk_tags
)

from constructs import Construct

from os import getenv
from typing import Any, Optional


class WebUiAmplifyStack(Stack):
    """
    CDK Stack for deploying PAVI WebUI using AWS Amplify.

    This provides an alternative to Elastic Beanstalk with better
    Next.js optimization and simpler deployment workflow.
    """

    amplify_app: amplify.App
    main_branch: amplify.Branch
    dev_branch: Optional[amplify.Branch]

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_suffix: str = "main",
        github_owner: str = "alliance-genome",
        github_repo: str = "agr_pavi",
        github_token_secret_name: str = "pavi/github-token",
        enable_preview_branches: bool = True,
        custom_domain: Optional[str] = None,
        **kwargs: Any
    ) -> None:
        """
        Initialize the Amplify stack for WebUI.

        Args:
            scope: CDK scope
            construct_id: Stack identifier
            env_suffix: Environment suffix (main, dev, etc.)
            github_owner: GitHub organization/user
            github_repo: GitHub repository name
            github_token_secret_name: Secrets Manager secret containing GitHub token
            enable_preview_branches: Enable preview deployments for PRs
            custom_domain: Optional custom domain (e.g., pavi.alliancegenome.org)
        """
        super().__init__(scope, construct_id, **kwargs)

        # Tag resources
        cdk_tags.of(self).add("Product", "PAVI")
        cdk_tags.of(self).add("CreatedBy", "PAVI")
        cdk_tags.of(self).add("AppComponent", "webUI")
        cdk_tags.of(self).add("Environment", env_suffix)

        # Get API endpoint from API stack
        api_stack_name = getenv('PAVI_API_STACK_NAME', 'PaviApiEbMainStack')
        pavi_api_endpoint_domain = CfnFn.import_value(f'{api_stack_name}:endpointUrl')
        pavi_api_base_url = f'http://{pavi_api_endpoint_domain}'

        # Get GitHub token from Secrets Manager
        github_token = SecretValue.secrets_manager(
            github_token_secret_name,
            json_field='token'
        )

        # Create Amplify App
        self.amplify_app = amplify.App(
            self,
            f'pavi-webui-{env_suffix}',
            app_name=f'pavi-webui-{env_suffix}',
            source_code_provider=amplify.GitHubSourceCodeProvider(
                owner=github_owner,
                repository=github_repo,
                oauth_token=github_token
            ),
            # Build settings for Next.js
            build_spec=amplify.BuildSpec.from_object_to_yaml({
                'version': '1.0',
                'applications': [{
                    'appRoot': 'webui',
                    'frontend': {
                        'phases': {
                            'preBuild': {
                                'commands': [
                                    'nvm use 22',
                                    'npm ci --strict-peer-deps'
                                ]
                            },
                            'build': {
                                'commands': [
                                    'npm run build'
                                ]
                            }
                        },
                        'artifacts': {
                            'baseDirectory': '.next',
                            'files': ['**/*']
                        },
                        'cache': {
                            'paths': [
                                'node_modules/**/*',
                                '.next/cache/**/*'
                            ]
                        }
                    }
                }]
            }),
            # Environment variables
            environment_variables={
                'PAVI_API_BASE_URL': pavi_api_base_url,
                'AGR_PAVI_RELEASE': getenv('PAVI_IMAGE_TAG', 'latest'),
                'NEXT_TELEMETRY_DISABLED': '1',
                '_LIVE_UPDATES': '[{"name":"Node.js version","pkg":"node","type":"nvm","version":"22"}]'
            },
            # Enable automatic branch detection
            auto_branch_deletion=True,
            # Platform for Next.js SSR
            platform=amplify.Platform.WEB_COMPUTE
        )

        # Main branch (production)
        self.main_branch = self.amplify_app.add_branch(
            'main',
            branch_name='main',
            stage=amplify.BranchStage.PRODUCTION,
            auto_build=True,
            pull_request_preview=enable_preview_branches
        )

        # Dev branch
        self.dev_branch = self.amplify_app.add_branch(
            'dev',
            branch_name='dev',
            stage=amplify.BranchStage.DEVELOPMENT,
            auto_build=True,
            pull_request_preview=enable_preview_branches
        )

        # Feature branch pattern for previews
        if enable_preview_branches:
            self.amplify_app.add_branch(
                'feature-branches',
                branch_name='feature/*',
                stage=amplify.BranchStage.DEVELOPMENT,
                auto_build=True,
                pull_request_preview=True
            )

        # Custom domain configuration
        if custom_domain:
            domain = self.amplify_app.add_domain(
                f'{custom_domain}-domain',
                domain_name=custom_domain,
                enable_auto_subdomain=True
            )
            domain.map_root(self.main_branch)
            domain.map_sub_domain(self.dev_branch, 'dev')

        # Outputs
        CfnOutput(
            self,
            'AmplifyAppId',
            value=self.amplify_app.app_id,
            description='Amplify App ID'
        )

        CfnOutput(
            self,
            'AmplifyAppUrl',
            value=f'https://main.{self.amplify_app.default_domain}',
            description='Amplify App URL (main branch)'
        )

        CfnOutput(
            self,
            'AmplifyDevUrl',
            value=f'https://dev.{self.amplify_app.default_domain}',
            description='Amplify App URL (dev branch)'
        )

        if custom_domain:
            CfnOutput(
                self,
                'CustomDomainUrl',
                value=f'https://{custom_domain}',
                description='Custom domain URL'
            )
