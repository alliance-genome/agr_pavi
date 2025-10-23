type testInputType = {
    "gene": {
        /* text to be typed into the search box */
        "type": string,
        /* selecting either the options matching the select string, or the nth option when a number. */
        "select"?: string|number
    },
    "transcripts": string[],
    "delete"?: boolean
    "alleles"?: string[]
}

const formInputData: testInputType[] = [
    {
        "gene": {
            "type": "HGNC:620"
        },
        "transcripts": [
            "ENST00000346798.8",
            "ENST00000357903.7"
        ],
        "delete": true
    },
    {
        "gene": {
            "type": "apl-1",
            "select": "apl-1 (Cel)"
        },
        "transcripts": [
            "C42D8.8a.1"
        ],
        "alleles": [
            "yn32"
        ]
    },
    {
        "gene": {
            "type": "WB:WBGene00000149"
        },
        "transcripts": [
            "C42D8.8a.1"
        ],
        "alleles": [
            "NC_003284.9:g.5113285_5115215del"
        ]
    },
    {
        "gene": {
            "type": "WB:WBGene00006318"
        },
        "transcripts": [
            "F34D6.3.1"
        ],
        "alleles": [
            "WB:WBVar00090295"
        ]
    },
    {
        "gene": {
            "type": "WB:WBGene00000149"
        },
        "transcripts": [
            "C42D8.8a.1"
        ],
        "alleles": [
            "NC_003284.9:g.5114519C>G"
        ]
    },
    {
        "gene": {
            "type": "WB:WBGene00011034"
        },
        "transcripts": [
            "R05D11.6.1"
        ],
        "alleles": [
            "WB:WBVar02145282"
        ]
    },
    {
        "gene": {
            "type": "FB:FBgn0000108"
        },
        "transcripts": [
            "Appl-RA",
            "Appl-RB"
        ]
    },
    {
        "gene": {
            "type": "WB:WBGene00003232"
        },
        "transcripts": [
            "ZC506.4a.1"
        ]
    }
]

export default formInputData
