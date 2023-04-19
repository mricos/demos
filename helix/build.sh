#!/bin/bash
cp src/index.html public/index.html  # This is where to add build time info
postcss src/styles.css -o public/styles.css
