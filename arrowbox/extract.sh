#!/bin/bash

# Define output directory for the extracted files
OUTPUT_DIR="./extracted"
mkdir -p "$OUTPUT_DIR"

# Initialize state variables
current_file=""
in_code_block=false

# Read from stdin
while IFS= read -r line || [[ -n $line ]]; do
  # Detect the start of a file definition with backtick-enclosed filename
  if [[ $line =~ ^#+.*\`([^`]+)\` ]]; then
    # Extract the filename from the first backtick-enclosed group
    filename="${BASH_REMATCH[1]}"
    
    # Define the full path for the output file
    current_file="$OUTPUT_DIR/$filename"
    
    # Create the directory if it doesn't exist
    mkdir -p "$(dirname "$current_file")"
    
    # Clear or create the file
    : > "$current_file"
    
    # Reset the code block flag in case a new file starts
    in_code_block=false
    continue
  fi

  # Detect start or end of a code block
  if [[ $line =~ ^``` ]]; then
    if [[ $in_code_block == true ]]; then
      in_code_block=false
    else
      in_code_block=true
    fi
    continue
  fi

  # Write lines to the current file if inside a code block
  if [[ $in_code_block == true && -n $current_file ]]; then
    echo "$line" >> "$current_file"
  fi
done

# Check for unclosed code block
if [[ $in_code_block == true ]]; then
  echo "Error: Unclosed code block detected." >&2
  exit 1
fi

echo "Code has been successfully extracted to $OUTPUT_DIR."
