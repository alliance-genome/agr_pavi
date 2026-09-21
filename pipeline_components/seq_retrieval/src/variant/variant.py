"""
Module containing the Variant class and related functions.
"""

from enum import Enum

import requests

from typing import Any, List, Optional, override, TYPE_CHECKING
from log_mgmt import get_logger

# Only import on type-checking to prevent circular dependency at runtime
if TYPE_CHECKING:
    from seq_region.seq_region import SeqRegion  # pragma: no cover

logger = get_logger(name=__name__)


class SeqSubstitutionType(Enum):
    """Value enum for variant sequence substitution type"""

    DELETION = "deletion"
    """Ref by alt seq replacement results in deletion of ref sequence."""
    INSERTION = "insertion"
    """Ref by alt seq replacement results in insertion of alt sequence."""
    INDEL = "indel"
    """Ref by alt seq replacement results in combination of deletion of ref sequence and insertion of alt sequence of unequal length."""
    SUBSTITUTION = "substitution"
    """Ref by alt seq replacement results in substitution of ref sequence by alt sequence of equal length."""


class Variant:
    """
    Defines a sequence region variant.
    """

    variant_id: str
    """ID of the variant"""

    genomic_seq_id: str
    """ID of the genomic sequence region"""

    genomic_start_pos: int
    """Genomic start position of the variant (1-based, inclusive)"""

    genomic_end_pos: int
    """Genomic end position of the variant (1-based, inclusive)"""

    genomic_ref_seq: str
    """Genomic reference sequence of the variant"""

    genomic_alt_seq: str
    """Genomic alternative sequence of the variant"""

    seq_substitution_type: SeqSubstitutionType
    """Sequence substitution type of the variant when replacing the reference sequence with the alternative sequence"""

    molecular_consequences: List[str]
    """List of molecular consequence terms from the Alliance API (e.g., '3_prime_UTR_variant', 'missense_variant')"""

    # Consequence terms that do NOT affect protein sequence
    NON_CODING_CONSEQUENCES = frozenset([
        "3_prime_UTR_variant",
        "5_prime_UTR_variant",
        "intron_variant",
        "upstream_gene_variant",
        "downstream_gene_variant",
        "intergenic_variant",
        "non_coding_transcript_variant",
        "non_coding_transcript_exon_variant",
        "mature_miRNA_variant",
        "NMD_transcript_variant",
    ])

    def __init__(
        self,
        variant_id: str,
        seq_id: str,
        start: int,
        end: int,
        genomic_ref_seq: Optional[str] = None,
        genomic_alt_seq: Optional[str] = None,
        molecular_consequences: Optional[List[str]] = None,
        hgvs_protein: Optional[str] = None,
        hgvs_coding: Optional[str] = None,
        impact: Optional[str] = None,
        gene_id: Optional[str] = None,
    ):
        """
        Initializes a Variant instance.

        Args:
            variant_id: ID of the variant.
            seq_id: ID of the sequence region.
            start: Start position of the variant (<= end).
            end: End position of the variant (>= start).
            genomic_ref_seq: Reference sequence at the variant position.
            genomic_alt_seq: Alternative sequence at the variant position.
            molecular_consequences: List of SO terms describing the variant's molecular consequences.
            hgvs_protein: HGVS protein nomenclature (e.g. NP_000316.2:p.Leu278Ser).
            hgvs_coding: HGVS coding nomenclature (e.g. NM_000325.6:c.833T>C).
            impact: Predicted impact of the variant (e.g. MODERATE).
            gene_id: Alliance gene ID associated with the variant (e.g. WB:WBGene00000149).
        """
        # Ensure start <= end
        if start > end:
            raise ValueError(
                f"Invalid variant positions: start position ({start}) > end position ({end})."
            )

        # Ensure one of genomic_ref_seq or genomic_alt_seq is provided
        if not genomic_ref_seq and not genomic_alt_seq:
            raise ValueError(
                "Variant must have at least one of genomic_ref_seq or genomic_alt_seq provided."
            )

        # For insertions, ensure start and end position indicate insertion site boundaries (2 bp)
        if not genomic_ref_seq and end - 1 != start:
            raise ValueError(
                "Insertions must have start and end positions that indicate insertion site boundaries (2 flanking bases)."
            )

        # Calculate substitution type
        substitution_type: SeqSubstitutionType
        if (
            genomic_ref_seq
            and genomic_alt_seq
            and len(genomic_ref_seq) == len(genomic_alt_seq)
        ):
            substitution_type = SeqSubstitutionType.SUBSTITUTION
        elif genomic_alt_seq is None or len(genomic_alt_seq) == 0:
            substitution_type = SeqSubstitutionType.DELETION
        elif genomic_ref_seq is None or len(genomic_ref_seq) == 0:
            substitution_type = SeqSubstitutionType.INSERTION
        else:
            substitution_type = SeqSubstitutionType.INDEL

        self.variant_id = variant_id
        self.genomic_seq_id = seq_id
        self.genomic_start_pos = start
        self.genomic_end_pos = end
        self.seq_length = end - start + 1
        self.genomic_ref_seq = genomic_ref_seq or ""
        self.genomic_alt_seq = genomic_alt_seq or ""
        self.seq_substitution_type = substitution_type
        self.molecular_consequences = molecular_consequences or []
        self.hgvs_protein = hgvs_protein
        self.hgvs_coding = hgvs_coding
        self.impact = impact
        self.gene_id = gene_id

    def affects_protein_sequence(self) -> bool:
        """
        Checks if this variant affects the protein sequence.

        Returns True if the variant has coding consequences (missense, frameshift, etc.)
        or if no molecular consequences are known (conservative default).
        Returns False if all consequences are non-coding (UTR, intron, intergenic, etc.).

        Returns:
            True if the variant affects protein sequence, False otherwise.
        """
        # If no consequences are known, assume it might affect protein (conservative)
        if not self.molecular_consequences:
            return True

        # Check if ALL consequences are non-coding
        # If any consequence is coding (not in NON_CODING_CONSEQUENCES), return True
        for consequence in self.molecular_consequences:
            if consequence not in self.NON_CODING_CONSEQUENCES:
                return True

        # All consequences are non-coding
        logger.debug(
            f"Variant {self.variant_id} has only non-coding consequences: {self.molecular_consequences}"
        )
        return False

    @classmethod
    def from_dict(cls, variant_dict: dict[str, Any]) -> "Variant":
        if "variant_id" not in variant_dict:
            raise KeyError("variant_id not in variant_dict")
        elif not isinstance(variant_dict["variant_id"], str):
            raise TypeError("variant_id must be a string")

        if "genomic_seq_id" not in variant_dict:
            raise KeyError("genomic_seq_id not in variant_dict")
        elif not isinstance(variant_dict["genomic_seq_id"], str):
            raise TypeError("genomic_seq_id must be a string")

        if "genomic_start_pos" not in variant_dict:
            raise KeyError("genomic_start_pos not in variant_dict")
        elif not isinstance(variant_dict["genomic_start_pos"], int):
            raise TypeError("genomic_start_pos must be an integer")

        if "genomic_end_pos" not in variant_dict:
            raise KeyError("genomic_end_pos not in variant_dict")
        elif not isinstance(variant_dict["genomic_end_pos"], int):
            raise TypeError("genomic_end_pos must be an integer")

        genomic_ref_seq = None
        if "genomic_ref_seq" in variant_dict:
            genomic_ref_seq = variant_dict["genomic_ref_seq"]

        genomic_alt_seq = None
        if "genomic_alt_seq" in variant_dict:
            genomic_alt_seq = variant_dict["genomic_alt_seq"]

        molecular_consequences = None
        if "molecular_consequences" in variant_dict:
            molecular_consequences = variant_dict["molecular_consequences"]

        return cls(
            variant_id=variant_dict["variant_id"],
            seq_id=variant_dict["genomic_seq_id"],
            start=variant_dict["genomic_start_pos"],
            end=variant_dict["genomic_end_pos"],
            genomic_ref_seq=genomic_ref_seq,
            genomic_alt_seq=genomic_alt_seq,
            molecular_consequences=molecular_consequences,
        )

    @override
    def __eq__(self, other: object) -> bool:
        if isinstance(other, self.__class__):
            if (
                self.variant_id == other.variant_id
                and self.genomic_seq_id == other.genomic_seq_id
                and self.genomic_start_pos == other.genomic_start_pos
                and self.genomic_end_pos == other.genomic_end_pos
                and self.genomic_ref_seq == other.genomic_ref_seq
                and self.genomic_alt_seq == other.genomic_alt_seq
                and self.molecular_consequences == other.molecular_consequences
                and self.hgvs_protein == other.hgvs_protein
                and self.hgvs_coding == other.hgvs_coding
                and self.impact == other.impact
                and self.gene_id == other.gene_id
            ):
                return True
        return False

    @override
    def __str__(self) -> str:  # pragma: no cover
        object_str = f"{self.variant_id} {self.genomic_seq_id}:{self.genomic_start_pos}-{self.genomic_end_pos} {self.genomic_ref_seq or '-'}/{self.genomic_alt_seq or '-'}"

        return object_str

    @override
    def __repr__(self) -> str:  # pragma: no cover
        return self.__str__()

    @classmethod
    def from_variant_id(cls, variant_id: str) -> "Variant":
        """
        Fetches variant information from the public web API \
        and returns it as a Variant object.

        Args:
            variant_id: string representing the (AGR) variant ID.

        Returns:
            a Variant object containing the variant information.
        """

        # Fetch variant information from the public web API.
        url = f"https://www.alliancegenome.org/api/variant/{variant_id}"
        response = requests.get(url)
        response.raise_for_status()
        variant_data = response.json()

        # The Alliance v9 response shape moved the variant location and
        # consequence data under `variantList[].curatedVariantGenomicLocations[]`
        # with predicted consequences under each location's
        # `predictedVariantConsequences[]`. The old shape kept everything
        # at the top level under `location` and `transcriptLevelConsequence`.
        # Support both, preferring the old fields if present.
        is_legacy_shape = "location" in variant_data

        molecular_consequences: List[str] = []
        hgvs_protein = None
        hgvs_coding = None
        impact = None
        seq_id = None
        start = None
        end = None
        genomic_ref_seq = None
        genomic_alt_seq = None
        gene_id = None

        if is_legacy_shape:
            transcript_consequences = variant_data.get("transcriptLevelConsequence", [])
            for consequence in transcript_consequences:
                for mc in consequence.get("molecularConsequences", []) or []:
                    if mc not in molecular_consequences:
                        molecular_consequences.append(mc)
            if transcript_consequences:
                first = transcript_consequences[0]
                hgvs_protein = first.get("hgvsProteinNomenclature")
                hgvs_coding = first.get("hgvsCodingNomenclature")
                impact = first.get("impact")

            gene_data = variant_data.get("gene", {})
            gene_id = gene_data.get("id") if isinstance(gene_data, dict) else None

            location = variant_data.get("location", {})
            seq_id = location.get("chromosome")
            start = location.get("start")
            end = location.get("end")
            genomic_ref_seq = variant_data.get("genomicReferenceSequence")
            genomic_alt_seq = variant_data.get("genomicVariantSequence")
        else:
            variant_list = variant_data.get("variantList") or []
            location = {}
            if variant_list:
                locations = variant_list[0].get("curatedVariantGenomicLocations") or []
                if locations:
                    location = locations[0]

            seq_id = (
                location.get("variantGenomicLocationAssociationObject", {})
                .get("name")
            )
            start = location.get("start")
            end = location.get("end")
            genomic_ref_seq = location.get("referenceSequence")
            genomic_alt_seq = location.get("variantSequence")

            # Aggregate molecular consequences across every predicted
            # consequence on this location, deduped, preserving order.
            predicted = location.get("predictedVariantConsequences") or []
            for pc in predicted:
                for vc in pc.get("vepConsequences") or []:
                    name = vc.get("name") if isinstance(vc, dict) else vc
                    if name and name not in molecular_consequences:
                        molecular_consequences.append(name)

            # First predicted consequence's HGVS + impact match the prior
            # "first transcript_consequence" semantics closely enough.
            most_severe = location.get("mostSevereConsequence") or (predicted[0] if predicted else None)
            if most_severe:
                hgvs_protein = most_severe.get("hgvsProteinNomenclature")
                hgvs_coding = most_severe.get("hgvsCodingNomenclature")
                vep_impact = most_severe.get("vepImpact")
                if isinstance(vep_impact, dict):
                    impact = vep_impact.get("name")
                else:
                    impact = vep_impact

            gene_ids = variant_data.get("geneIds") or []
            if gene_ids:
                gene_id = gene_ids[0]

        return cls(
            variant_id=variant_id,
            seq_id=seq_id,
            start=start,
            end=end,
            genomic_ref_seq=genomic_ref_seq,
            genomic_alt_seq=genomic_alt_seq,
            molecular_consequences=molecular_consequences,
            hgvs_protein=hgvs_protein,
            hgvs_coding=hgvs_coding,
            impact=impact,
            gene_id=gene_id,
        )

    def overlaps(self, other: "Variant|SeqRegion") -> bool:
        """
        Checks if this variant overlaps with another sequence object.

        Args:
            other: Another sequence object to compare to. Variant or SeqRegion.

        Returns:
            True if the sequence objects overlap with the variant (`self`), False otherwise.
        """
        from seq_region import SeqRegion  # Imported here to prevent circular dependency

        overlaps = False

        other_start: int
        other_end: int
        other_seq_id: str

        if isinstance(other, Variant):
            other_seq_id = other.genomic_seq_id
            other_start = other.genomic_start_pos
            other_end = other.genomic_end_pos
        elif isinstance(other, SeqRegion):
            other_seq_id = other.seq_id
            other_start = other.start
            other_end = other.end
        else:
            raise NotImplementedError(
                f'Overlap detection of variant with class "{other.__class__}" not implemented.'
            )

        # Both variants must be on the same seq_id (chromosome or contig) to overlap
        # and have at least partially overlapping start and end positions
        if (
            self.genomic_seq_id == other_seq_id
            and self.genomic_end_pos >= other_start
            and self.genomic_start_pos <= other_end
        ):
            # For insertions, the complete insertion site must fall within the other variant
            if self.genomic_ref_seq == "":
                if (
                    self.genomic_start_pos >= other_start
                    and self.genomic_end_pos <= other_end
                ):
                    overlaps = True
            elif isinstance(other, Variant) and other.genomic_ref_seq == "":
                if (
                    other_start >= self.genomic_start_pos
                    and other_end <= self.genomic_end_pos
                ):
                    overlaps = True
            # For all other variants, partial overlap is sufficient
            else:
                overlaps = True

        return overlaps


def variants_overlap(variants: List[Variant]) -> bool:
    """
    Checks if any two Variants in a list overlap.
    Args:
        variants: List of Variant objects.
    Returns:
        True if any two variants overlap, False otherwise.
    """
    sorted_variants = sorted(
        variants, key=lambda x: (x.genomic_seq_id, x.genomic_start_pos)
    )
    for i in range((len(sorted_variants) - 1)):
        if sorted_variants[i].overlaps(sorted_variants[i + 1]):
            return True

    return False
