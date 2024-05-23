import click
from os import listdir, path
from zipfile import ZipFile

from .eb.eb_app_version import eb_app_version_exists, create_eb_app_version
from .s3.eb_assets import upload_application_bundle


@click.command(context_settings={'show_default': True})
@click.option("--eb_app_name", type=click.STRING, required=True,
              help="The Elasticbeanstalk application name to deploy a new version for.")
@click.option("--version_label", type=click.STRING, required=True,
              help="The version label to assign to the EB application version.")
def main(eb_app_name: str, version_label: str) -> None:
    """
    Main method to deploy EB application versions. Receives input args from click.

    Checks if an EB application version already exists with the defined version_label,
    and deploys the current working directory as a new application version with that label if not.
    """
    ## Search EB application version by label
    ## Note: EB application version management is done external to CDK,
    ## as Cloudformation/CDK does not support custom labels at current (2024/05/17).
    if not eb_app_version_exists(eb_app_name=eb_app_name, version_label=version_label):
        print(f'Creating new application version with label "{version_label}".')
        # Create app zip
        dir_path = path.dirname(path.realpath(__file__))
        app_zip_path = 'eb_app.zip'
        with ZipFile(app_zip_path, 'w') as zipObj:
            ## Add docker-compose file
            docker_compose_file = f'{dir_path}/../../docker-compose.yml'
            zipObj.write(docker_compose_file, path.basename(path.normpath(docker_compose_file)))

            ## Add all files in .ebextensions/
            ebextensions_path = f'{dir_path}/../.ebextensions/'
            for filename in listdir(ebextensions_path):
                full_file_path = path.join(ebextensions_path, filename)
                if path.isfile(full_file_path):
                    zipObj.write(full_file_path, path.join('.ebextensions/', filename))

        # Upload app zip as s3 source bundle
        source_bundle = upload_application_bundle(
            eb_app_name=eb_app_name,
            version_label=version_label,
            bundle_path=app_zip_path)

        # Create new application version with label
        create_eb_app_version(
            eb_app_name=eb_app_name, version_label=version_label,
            source_bundle=source_bundle,
            tags=[{'Key': 'Product', 'Value': 'PAVI'},
                  {'Key': 'Managed_by', 'Value': 'PAVI'}])
    else:
        print(f'Application version with label "{version_label}" already exists.')


if __name__ == '__main__':
    main()
