This subdirectory contains the alignment component of PAVI.

# Local invocation and testing instructions
To build the docker image:
```bash
make docker-image
```

To build a clean docker image (without using caching, for troubleshooting potential caching issues):
```bash
make clean docker-image
```

Then run the container to run any alignment.

Use a volume mount (`-v`) as appropriate to provide the container access to the input and output directorie(s)
on your local system.  
Specify the clustalo command-line arguments as appropriate after the `docker run` command, as per below example:
```bash
docker run -v /abs/path/to/in-out-dir:/mnt/pavi/ --rm agr_pavi/alignment \
 clustalo -i /mnt/pavi/input-seqs.fa --outfmt=clustal --resno -o /mnt/pavi/clustal-output.aln
```
Once the run completed, Clustal-formatted alignment results can then be found locally in `</abs/path/to/in-out-dir>/clustal-output.aln`.
