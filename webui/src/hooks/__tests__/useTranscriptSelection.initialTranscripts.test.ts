// useTranscriptSelection imports the vendored species config at module scope;
// mock it so the module can be required in the jsdom test environment (mirrors
// the mock in AlignmentEntry.test.tsx).
jest.mock(
    '@/utils/agrSpeciesConfig',
    () => ({
        getSpecies: jest.fn(),
        getSingleGenomeLocation: jest.fn(),
        gffFileUrl: jest.fn(() => ''),
    })
);

import { selectInitialTranscriptIds } from '../useTranscriptSelection';

// A minimal stand-in for a GffTranscript: only the members
// selectInitialTranscriptIds uses (id, name).
function feature(id: string, name: string) {
    return { id, name };
}

describe('selectInitialTranscriptIds', () => {
    const list = [feature('id-a', 'ENST-A'), feature('id-b', 'ENST-B'), feature('id-c', 'ENST-C')];

    it('returns the ids of transcripts whose name matches (in list order)', () => {
        expect(selectInitialTranscriptIds(list as any, ['ENST-C', 'ENST-A'])).toEqual(['id-a', 'id-c']);
    });

    it('ignores names that are not present', () => {
        expect(selectInitialTranscriptIds(list as any, ['ENST-A', 'MISSING'])).toEqual(['id-a']);
    });

    it('returns an empty array when no names match', () => {
        expect(selectInitialTranscriptIds(list as any, ['NONE'])).toEqual([]);
    });
});
