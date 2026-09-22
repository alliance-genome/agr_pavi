#!/bin/bash
FILEPATH=$1
OUTDIR=$2
OUTFILE=${OUTDIR}/${FILEPATH}.md

# GitHub rejects PR comments over 65536 characters. Each file's diff is posted
# as its own comment when the combined diff is large, so a single huge diff
# (e.g. webui/package-lock.json) must be truncated or the whole job fails.
MAX_DIFF_CHARS=60000

DIFF_FILE=$(mktemp)
git diff -- ${FILEPATH} > ${DIFF_FILE}
DIFF_CHARS=$(wc -m < ${DIFF_FILE})

install -D /dev/null ${OUTFILE}
echo '<details>' >> ${OUTFILE}
echo '<summary>'${FILEPATH}'</summary>' >> ${OUTFILE}
echo '' >> ${OUTFILE}
echo '```diff' >> ${OUTFILE}
if [ "${DIFF_CHARS}" -gt "${MAX_DIFF_CHARS}" ]; then
    head -c ${MAX_DIFF_CHARS} ${DIFF_FILE} >> ${OUTFILE}
    echo '' >> ${OUTFILE}
    echo '```' >> ${OUTFILE}
    echo "Diff truncated (${DIFF_CHARS} characters). The full file is in the \`deps_lock_files_bundle\` artifact." >> ${OUTFILE}
else
    cat ${DIFF_FILE} >> ${OUTFILE}
    echo '```' >> ${OUTFILE}
fi
echo '</details>' >> ${OUTFILE}
echo '' >> ${OUTFILE}
rm -f ${DIFF_FILE}

echo ${OUTFILE}
