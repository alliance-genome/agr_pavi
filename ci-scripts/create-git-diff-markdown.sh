#!/bin/bash
FILEPATH=$1
OUTDIR=$2
OUTFILE=${OUTDIR}/${FILEPATH}.md

install -D /dev/null ${OUTFILE}
echo '<details>' >> ${OUTFILE}
echo '<summary>'${FILEPATH}'</summary>' >> ${OUTFILE}
echo '' >> ${OUTFILE}
echo '```diff' >> ${OUTFILE}
git diff -- ${FILEPATH} >> ${OUTDIR}/${FILEPATH}.md
echo '```' >> ${OUTFILE}
echo '</details>' >> ${OUTFILE}
echo '' >> ${OUTFILE}

echo ${OUTFILE}
