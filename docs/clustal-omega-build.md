# Building Clustal Omega from Source

This document provides detailed instructions for building Clustal Omega from source on Amazon Linux 2023, which is required for the local EC2 deployment mode.

## Why Build from Source?

1. **Not in standard repositories**: Clustal Omega is not available in Amazon Linux 2023 yum repositories
2. **Official download site issues**: The clustal.org website redirects downloads, making direct binary downloads unreliable
3. **Dependency on argtable2**: Clustal Omega requires argtable2, which is also not in standard repositories

## Prerequisites

### System Packages

```bash
# Install build tools
sudo yum install -y \
  gcc \
  gcc-c++ \
  make \
  cmake \
  autoconf \
  automake \
  libtool \
  git

# Verify installations
gcc --version      # Should show GCC 11.x
cmake --version    # Should show 3.22.x
autoconf --version # Should show 2.69
```

## Step 1: Build and Install argtable2

Clustal Omega requires argtable2 for command-line argument parsing. Note: argtable3 exists but is not compatible.

### Clone the Repository

```bash
cd /tmp
git clone https://github.com/jonathanmarvens/argtable2.git
cd argtable2-master
```

### Build with CMake

```bash
mkdir -p build
cd build
cmake ..
make -j4
```

**Expected output:**
```
-- The C compiler identification is GNU 11.5.0
-- Configuring done
-- Generating done
[100%] Built target argtable2
```

### Install

```bash
sudo make install
```

**Important**: The CMake build doesn't install the header file, so copy it manually:

```bash
sudo cp /tmp/argtable2-master/src/argtable2.h /usr/local/include/
```

### Verify Installation

```bash
ls -la /usr/local/include/argtable2.h
# -rw-r--r--. 1 root root 12345 ... /usr/local/include/argtable2.h

ls -la /usr/local/lib/libargtable2.a
# -rw-r--r--. 1 root root 67890 ... /usr/local/lib/libargtable2.a
```

## Step 2: Build and Install Clustal Omega

### Clone the Repository

```bash
cd /tmp
git clone https://github.com/GSLBiotech/clustal-omega.git
cd clustal-omega
```

### Generate Configure Script

The repository includes autotools configuration but needs regeneration:

```bash
autoreconf -fi
```

**Expected warnings** (can be ignored):
```
configure.ac:150: warning: AC_LANG_CONFTEST: no AC_LANG_SOURCE call detected in body
```

### Configure

```bash
./configure CFLAGS="-I/usr/local/include" LDFLAGS="-L/usr/local/lib"
```

**Expected output:**
```
    Welcome to Clustal Omega - version 1.2.4 (AndreaGiacomo)

                       +NMMMMMMMMMS=
                    MMMMM?      :MMMMM8
                  ...

checking for argtable2.h... yes
checking for arg_parse in -largtable2... yes
...
configure: creating ./config.status
```

**If configure fails with "Could not find argtable2.h":**
- Verify argtable2.h is in /usr/local/include
- Try: `./configure CFLAGS="-I/usr/local/include" CPPFLAGS="-I/usr/local/include" LDFLAGS="-L/usr/local/lib"`

### Build

```bash
make -j4
```

**Expected output:**
```
...
libtool: link: g++ -O3 -fopenmp -g -O2 -o clustalo main.o mymain.o ...
make[1]: Leaving directory '/tmp/clustal-omega/src'
```

**Warning** (can be ignored):
```
/usr/bin/ld: warning: the use of `mktemp' is dangerous, better use `mkstemp'
```

### Install

```bash
sudo make install
```

**Installation locations:**
- Binary: `/usr/local/bin/clustalo`
- Library: `/usr/local/lib/libclustalo.a`
- Headers: `/usr/local/include/clustalo/`
- Pkg-config: `/usr/local/lib/pkgconfig/clustalo.pc`
- Documentation: `/usr/local/share/doc/clustal-omega/`

### Verify Installation

```bash
which clustalo
# /usr/local/bin/clustalo

clustalo --version
# 1.2.4

# Test with sample input
echo -e ">seq1\nACDEFGHIKLMNPQRSTVWY\n>seq2\nACDEFGHIKLMNPQRSTVWY" > /tmp/test.fa
clustalo -i /tmp/test.fa --outfmt=clustal
```

**Expected test output:**
```
CLUSTAL O(1.2.4) multiple sequence alignment

seq1            ACDEFGHIKLMNPQRSTVWY 20
seq2            ACDEFGHIKLMNPQRSTVWY 20
                ********************
```

## Troubleshooting

### "clustalo: command not found"

Ensure /usr/local/bin is in PATH:

```bash
export PATH="/usr/local/bin:$PATH"

# Or add to ~/.bashrc
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### "error while loading shared libraries"

If you get shared library errors:

```bash
# Add library path
export LD_LIBRARY_PATH="/usr/local/lib:$LD_LIBRARY_PATH"

# Or permanently
echo '/usr/local/lib' | sudo tee /etc/ld.so.conf.d/local.conf
sudo ldconfig
```

### "argtable2.h not found" during configure

```bash
# Check if file exists
ls /usr/local/include/argtable2.h

# If missing, copy from source
sudo cp /tmp/argtable2-master/src/argtable2.h /usr/local/include/

# Retry configure with explicit paths
./configure \
  CFLAGS="-I/usr/local/include" \
  CPPFLAGS="-I/usr/local/include" \
  LDFLAGS="-L/usr/local/lib"
```

### "aclocal-1.10: command not found" during make

This happens if autotools timestamps are wrong:

```bash
# Touch files to update timestamps
touch aclocal.m4 configure Makefile.in src/Makefile.in config.h.in

# Or install automake and regenerate
sudo yum install -y automake autoconf
autoreconf -fi
./configure CFLAGS="-I/usr/local/include" LDFLAGS="-L/usr/local/lib"
make -j4
```

## Build from Alternative Sources

If the GSLBiotech GitHub repository is unavailable:

### Option 1: EBI Mirror

```bash
cd /tmp
wget http://www.clustal.org/omega/clustal-omega-1.2.4.tar.gz
tar xzf clustal-omega-1.2.4.tar.gz
cd clustal-omega-1.2.4
./configure CFLAGS="-I/usr/local/include" LDFLAGS="-L/usr/local/lib"
make -j4
sudo make install
```

### Option 2: Bioconda (if conda available)

```bash
conda install -c bioconda clustalo
```

### Option 3: Docker Container

For testing without local installation:

```bash
docker run --rm -v /data:/data \
  quay.io/biocontainers/clustalo:1.2.4--h87f3376_5 \
  clustalo -i /data/input.fa -o /data/output.aln
```

## Clustal Omega Usage Reference

### Basic Multiple Sequence Alignment

```bash
clustalo -i input.fasta -o output.aln --outfmt=clustal
```

### Options Used by PAVI

```bash
clustalo \
  -i alignment-input.fa \      # Input FASTA file
  --outfmt=clustal \           # Output in CLUSTAL format
  --resno \                    # Add residue numbers to output
  -o alignment-output.aln      # Output file
```

### All Available Output Formats

- `fasta` - FASTA format
- `clustal` - CLUSTAL format (used by PAVI)
- `msf` - MSF format
- `phylip` - PHYLIP format
- `selex` - SELEX format
- `stockholm` - Stockholm format
- `vienna` - Vienna format

### Performance Options

```bash
# Use multiple threads
clustalo -i input.fa -o output.aln --threads=4

# Force recalculation (no caching)
clustalo -i input.fa -o output.aln --force

# Verbose output
clustalo -i input.fa -o output.aln -v
```

## Version Information

| Component | Version | Source |
|-----------|---------|--------|
| Clustal Omega | 1.2.4 | github.com/GSLBiotech/clustal-omega |
| argtable2 | 2.13 | github.com/jonathanmarvens/argtable2 |
| GCC | 11.5.0 | Amazon Linux 2023 |
| CMake | 3.22.2 | Amazon Linux 2023 |

## References

- [Clustal Omega Paper](https://doi.org/10.1038/msb.2011.75)
- [Clustal Omega Manual](http://www.clustal.org/omega/)
- [GSLBiotech GitHub Repository](https://github.com/GSLBiotech/clustal-omega)
- [argtable2 Documentation](http://argtable.sourceforge.net/)
