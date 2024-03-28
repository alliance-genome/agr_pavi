# Manual invokation and testing instructions
First build the docker image:
```bash
make docker-image
```

Then run the container to run any alignment.

Use a volume mount (`-v`) as appropriate to enable the container access to the input and output directorie(s).  
Specify the clustalo command-line arguments as appropriate after the `docker run` command, as per below example:
```bash
docker run -v /abs/path/to/in-out-dir:/mnt/pavi/ --rm pavi/alignment -i /mnt/pavi/input-seqs.fa -outfmt=clustal -o /mnt/pavi/clustal-output.aln
```
Once the run completed, Clustal-formattted alignment results can then be found locally in `</abs/path/to/in-out-dir>/clustal-output.aln`.
