'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { SeqInfoDict, EmbeddedVariant } from '../result/components/InteractiveAlignment/types';

// Dynamically import to avoid SSR issues with Web Components
const InteractiveAlignment = dynamic(
  () => import('../result/components/InteractiveAlignment/InteractiveAlignment'),
  { ssr: false, loading: () => <div>Loading alignment viewer...</div> }
);
const VirtualizedAlignment = dynamic(
  () => import('../result/components/InteractiveAlignment/VirtualizedAlignment'),
  { ssr: false, loading: () => <div>Loading virtualized viewer...</div> }
);

// Generate synthetic CLUSTAL-format alignment string
function generateClustalString(sequenceCount: number, sequenceLength: number = 300): string {
  const aminoAcids = 'ACDEFGHIKLMNPQRSTVWY';
  const lines: string[] = ['CLUSTAL O(1.2.4) multiple sequence alignment', '', ''];

  // Generate sequences
  const sequences: { name: string; seq: string }[] = [];

  // Generate reference sequence
  let refSequence = '';
  for (let i = 0; i < sequenceLength; i++) {
    refSequence += aminoAcids[Math.floor(Math.random() * aminoAcids.length)];
  }

  for (let i = 0; i < sequenceCount; i++) {
    const seqName = `SEQ_${String(i).padStart(4, '0')}`;

    // Create variant of reference (90% identity)
    let sequence = '';
    for (let j = 0; j < sequenceLength; j++) {
      if (Math.random() < 0.1) {
        sequence += aminoAcids[Math.floor(Math.random() * aminoAcids.length)];
      } else {
        sequence += refSequence[j];
      }
    }
    sequences.push({ name: seqName, seq: sequence });
  }

  // Format as CLUSTAL blocks (60 chars per line)
  const blockSize = 60;
  for (let blockStart = 0; blockStart < sequenceLength; blockStart += blockSize) {
    for (const seq of sequences) {
      const block = seq.seq.substring(blockStart, blockStart + blockSize);
      const paddedName = seq.name.padEnd(20, ' ');
      lines.push(`${paddedName}${block}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// Generate seqInfo with variant data
function generateSeqInfo(sequenceCount: number, sequenceLength: number = 300): SeqInfoDict {
  const seqInfo: SeqInfoDict = {};
  const aminoAcids = 'ACDEFGHIKLMNPQRSTVWY';

  for (let i = 0; i < sequenceCount; i++) {
    const seqName = `SEQ_${String(i).padStart(4, '0')}`;
    const variants: EmbeddedVariant[] = [];

    // Add 3-5 random variants per sequence
    const variantCount = 3 + Math.floor(Math.random() * 3);
    for (let v = 0; v < variantCount; v++) {
      const pos = Math.floor(Math.random() * sequenceLength) + 1;
      variants.push({
        alignment_start_pos: pos,
        alignment_end_pos: pos,
        seq_start_pos: pos,
        seq_end_pos: pos,
        seq_length: sequenceLength,
        variant_id: `rs${Math.floor(Math.random() * 1000000)}`,
        genomic_seq_id: 'chr1',
        genomic_start_pos: pos * 3,
        genomic_end_pos: pos * 3 + 2,
        genomic_ref_seq: aminoAcids[Math.floor(Math.random() * 20)],
        genomic_alt_seq: aminoAcids[Math.floor(Math.random() * 20)],
        seq_substitution_type: 'missense',
      });
    }

    seqInfo[seqName] = { embedded_variants: variants };
  }

  return seqInfo;
}

// FPS measurement hook
function useFPS() {
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const measureFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;

      if (delta >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / delta));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      rafIdRef.current = requestAnimationFrame(measureFPS);
    };

    rafIdRef.current = requestAnimationFrame(measureFPS);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return fps;
}

type RenderMode = 'legacy' | 'virtualized';

interface BenchmarkResult {
  sequenceCount: number;
  renderTime: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  memoryUsed: number | null;
  timestamp: string;
  mode: RenderMode;
}

export default function BenchmarkPage() {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [currentTest, setCurrentTest] = useState<number | null>(null);
  const [currentMode, setCurrentMode] = useState<RenderMode>('virtualized');
  const [testData, setTestData] = useState<{
    alignmentResult: string;
    seqInfo: SeqInfoDict;
  } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedMode, setSelectedMode] = useState<RenderMode | 'both'>('both');
  const fpsReadingsRef = useRef<number[]>([]);
  const fps = useFPS();

  const testSequenceCounts = [100, 500, 1000];

  // Collect FPS readings during test
  useEffect(() => {
    if (currentTest !== null && fps > 0) {
      fpsReadingsRef.current.push(fps);
    }
  }, [fps, currentTest]);

  const runBenchmark = useCallback(
    async (sequenceCount: number, mode: RenderMode): Promise<BenchmarkResult> => {
      console.log(`\n=== Starting benchmark for ${sequenceCount} sequences (${mode}) ===`);
      setCurrentTest(sequenceCount);
      setCurrentMode(mode);
      fpsReadingsRef.current = [];

      // Generate test data
      const startGenerate = performance.now();
      const alignmentResult = generateClustalString(sequenceCount);
      const seqInfo = generateSeqInfo(sequenceCount);
      const generateTime = performance.now() - startGenerate;
      console.log(`Data generation took ${generateTime.toFixed(2)}ms`);

      // Measure render time
      const startRender = performance.now();
      setTestData({ alignmentResult, seqInfo });

      // Wait for render to complete and collect FPS samples
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const renderTime = performance.now() - startRender;

      // Get memory usage if available
      let memoryUsed: number | null = null;
      if ('memory' in performance) {
        const memory = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
        memoryUsed = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      }

      // Calculate FPS stats from readings
      const readings = fpsReadingsRef.current;
      const avgFps = readings.length > 0 ? Math.round(readings.reduce((a, b) => a + b, 0) / readings.length) : 0;
      const minFps = readings.length > 0 ? Math.min(...readings) : 0;
      const maxFps = readings.length > 0 ? Math.max(...readings) : 0;

      const result: BenchmarkResult = {
        sequenceCount,
        renderTime: Math.round(renderTime),
        avgFps,
        minFps,
        maxFps,
        memoryUsed,
        timestamp: new Date().toISOString(),
        mode,
      };

      console.log('Benchmark result:', result);
      setResults((prev) => [...prev, result]);
      setCurrentTest(null);
      setTestData(null);

      // Force garbage collection opportunity
      await new Promise((resolve) => setTimeout(resolve, 500));

      return result;
    },
    []
  );

  const runAllBenchmarks = async () => {
    setIsRunning(true);
    setResults([]);

    const modesToTest: RenderMode[] =
      selectedMode === 'both' ? ['virtualized', 'legacy'] : [selectedMode];

    for (const mode of modesToTest) {
      for (const count of testSequenceCounts) {
        await runBenchmark(count, mode);
        // Delay between tests for cleanup
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    setIsRunning(false);
  };

  const getStatusIcon = (avgFps: number) => {
    if (avgFps >= 60) return '✅';
    if (avgFps >= 30) return '⚠️';
    return '❌';
  };

  const getStatusText = (avgFps: number) => {
    if (avgFps >= 60) return 'Good (60+ FPS)';
    if (avgFps >= 30) return 'Acceptable (30-60 FPS)';
    return 'Poor (<30 FPS)';
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>PAVI Frontend Performance Benchmark</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Tests Nightingale MSA rendering performance with varying sequence counts.
        <br />
        Current rendering: Canvas-based, 20px per sequence, no virtualization.
      </p>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Render Mode:</label>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value as RenderMode | 'both')}
            disabled={isRunning}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          >
            <option value="both">Compare Both</option>
            <option value="virtualized">Virtualized Only</option>
            <option value="legacy">Legacy Only</option>
          </select>
        </div>
        <button
          onClick={runAllBenchmarks}
          disabled={isRunning}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            backgroundColor: isRunning ? '#ccc' : '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
          }}
        >
          {isRunning ? 'Running Benchmark...' : 'Run Benchmarks'}
        </button>
      </div>

      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f5f5f5',
          borderRadius: '6px',
          fontFamily: 'monospace',
        }}
      >
        <strong>Live FPS: {fps}</strong>
        {currentTest && (
          <span style={{ marginLeft: '20px', color: '#0066cc' }}>
            🔄 Testing {currentTest} sequences... ({fpsReadingsRef.current.length} samples)
          </span>
        )}
      </div>

      {results.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Results</h2>
          <table
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              maxWidth: '900px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#333', color: 'white' }}>
                <th style={{ border: '1px solid #444', padding: '12px', textAlign: 'left' }}>
                  Mode
                </th>
                <th style={{ border: '1px solid #444', padding: '12px', textAlign: 'left' }}>
                  Sequences
                </th>
                <th style={{ border: '1px solid #444', padding: '12px', textAlign: 'left' }}>
                  Render Time
                </th>
                <th style={{ border: '1px solid #444', padding: '12px', textAlign: 'left' }}>
                  Avg FPS
                </th>
                <th style={{ border: '1px solid #444', padding: '12px', textAlign: 'left' }}>
                  Min/Max FPS
                </th>
                <th style={{ border: '1px solid #444', padding: '12px', textAlign: 'left' }}>
                  Memory
                </th>
                <th style={{ border: '1px solid #444', padding: '12px', textAlign: 'left' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '12px',
                      fontWeight: 'bold',
                      color: result.mode === 'virtualized' ? '#0066cc' : '#666',
                    }}
                  >
                    {result.mode === 'virtualized' ? 'Virtualized' : 'Legacy'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '12px', fontWeight: 'bold' }}>
                    {result.sequenceCount}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '12px' }}>{result.renderTime}ms</td>
                  <td
                    style={{
                      border: '1px solid #ddd',
                      padding: '12px',
                      fontWeight: 'bold',
                      color: result.avgFps < 30 ? '#d32f2f' : result.avgFps < 60 ? '#f57c00' : '#388e3c',
                    }}
                  >
                    {result.avgFps}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '12px', color: '#666' }}>
                    {result.minFps} / {result.maxFps}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                    {result.memoryUsed ? `${result.memoryUsed} MB` : 'N/A'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                    {getStatusIcon(result.avgFps)} {getStatusText(result.avgFps)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '30px' }}>
            <h3>Analysis</h3>
            <div
              style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '6px',
                padding: '15px',
                marginBottom: '15px',
              }}
            >
              <strong>Key Findings:</strong>
              <ul style={{ marginTop: '10px', marginBottom: 0 }}>
                <li>
                  Canvas height scales linearly: {results.map((r) => `${r.sequenceCount} seq = ${r.sequenceCount * 20}px`).join(', ')}
                </li>
                <li>No virtualization - all sequences rendered simultaneously</li>
                <li>O(n×m) complexity for variant overlay processing</li>
              </ul>
            </div>

            <h4>Raw Data (JSON)</h4>
            <pre
              style={{
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                padding: '15px',
                borderRadius: '6px',
                overflow: 'auto',
                fontSize: '12px',
              }}
            >
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Render test component */}
      {testData && (
        <div
          style={{
            marginTop: '20px',
            border: `2px solid ${currentMode === 'virtualized' ? '#0066cc' : '#666'}`,
            borderRadius: '6px',
            height: '400px',
            overflow: 'auto',
          }}
        >
          <div
            style={{
              backgroundColor: currentMode === 'virtualized' ? '#0066cc' : '#666',
              color: 'white',
              padding: '8px 12px',
              fontWeight: 'bold',
            }}
          >
            Live Preview: {currentTest} sequences ({currentMode === 'virtualized' ? 'Virtualized' : 'Legacy'})
          </div>
          {currentMode === 'virtualized' ? (
            <VirtualizedAlignment alignmentResult={testData.alignmentResult} seqInfoDict={testData.seqInfo} />
          ) : (
            <InteractiveAlignment alignmentResult={testData.alignmentResult} seqInfoDict={testData.seqInfo} />
          )}
        </div>
      )}
    </div>
  );
}
