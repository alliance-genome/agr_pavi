'''
Module containing helper functions to interact with AWS S3, for support of Elasticbeanstalk resources.
Note: these functions are calling AWS synchronously (so will search/modify AWS resources instantly).
'''

import boto3
from botocore.exceptions import ClientError

aws_account_nr = boto3.client('sts').get_caller_identity().get('Account')
AWS_REGION = 'us-east-1'

eb_s3_bucket_name = f'elasticbeanstalk-{AWS_REGION}-{aws_account_nr}'

s3_resources = boto3.resource('s3')
eb_s3_bucket = s3_resources.Bucket(eb_s3_bucket_name)


def upload_application_bundle(eb_app_name: str, version_label: str, bundle_path: str) -> dict[str, str]:
    '''
    Uploads an EB application bundle to S3 for use with EB.

    Args:
        eb_app_name: name of the application to create a version for
        version_label: EB version label to upload a bundle for
        bundle_path: path to application bundle to uplaod

    Returns:
        The source bundle to be used for creating a new EB application version with the uploaded assets.

    Raises:
        Exception: when upload failed.
    '''
    source_bundle_path = f'{eb_app_name}/{version_label}.zip'
    s3_object = eb_s3_bucket.Object(source_bundle_path)

    # Throw exception if source_bundle_path already exists
    try:
        s3_object.load()
    except ClientError:
        # No object found at source_bundle_path, proceed uploading
        pass
    else:
        raise Exception(f'Source bundle for {version_label} already found at "{source_bundle_path}".')

    # Upload the sourcebundle
    try:
        s3_object.upload_file(bundle_path)
    except ClientError:
        raise Exception('Exception caught while uploading bundle to S3.')

    return {
        'S3Bucket': eb_s3_bucket_name,
        'S3Key': source_bundle_path}
