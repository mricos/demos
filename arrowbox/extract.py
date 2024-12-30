#!/usr/bin/env python3

import os
import re
import sys

def extract_code_blocks(md_content, output_dir="./extracted"):
    os.makedirs(output_dir, exist_ok=True)
    
    # Regex patterns
    header_pattern = re.compile(r'^#+.*`([^`]+)`')
    code_block_start_pattern = re.compile(r'^```')
    
    current_file = None
    in_code_block = False
    
    for line_number, line in enumerate(md_content, start=1):
        line = line.rstrip('\n')
        
        # Check for header with backtick-enclosed filename
        header_match = header_pattern.match(line)
        if header_match:
            filename = header_match.group(1).strip()
            if not filename:
                print(f"Warning: Empty filename detected at line {line_number}. Skipping.", file=sys.stderr)
                current_file = None
                in_code_block = False
                continue
            current_file = os.path.join(output_dir, filename)
            os.makedirs(os.path.dirname(current_file), exist_ok=True)
            # Clear or create the file
            with open(current_file, 'w') as f:
                pass
            print(f"Detected file: {filename}")
            continue
        
        # Check for code block start/end
        if code_block_start_pattern.match(line):
            if in_code_block:
                in_code_block = False
                print(f"Exiting code block for: {current_file}")
            else:
                if not current_file:
                    print(f"Warning: Code block started at line {line_number} without a preceding file header. Skipping.", file=sys.stderr)
                    in_code_block = False
                    continue
                in_code_block = True
                print(f"Entering code block for: {current_file}")
            continue
        
        # If inside code block, write to file
        if in_code_block and current_file:
            try:
                with open(current_file, 'a') as f:
                    f.write(line + '\n')
            except Exception as e:
                print(f"Error writing to {current_file} at line {line_number}: {e}", file=sys.stderr)
    
    if in_code_block:
        print("Error: Unclosed code block detected at the end of the file.", file=sys.stderr)
        sys.exit(1)
    
    print(f"Code has been successfully extracted to '{output_dir}'.")
    
def main():
    if sys.stdin.isatty():
        print("Usage: cat all.md | ./extract.py", file=sys.stderr)
        sys.exit(1)
    
    md_content = sys.stdin.readlines()
    extract_code_blocks(md_content)

if __name__ == "__main__":
    main()
