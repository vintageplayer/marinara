#!/bin/bash

# Create fonts directory if it doesn't exist
mkdir -p public/fonts

# Download Source Sans Pro SemiBold files
curl -L -o public/fonts/SourceSansPro-SemiBold.woff2 "https://fonts.gstatic.com/s/sourcesanspro/v21/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rAkA.woff2"
curl -L -o public/fonts/SourceSansPro-SemiBold.woff "https://fonts.gstatic.com/s/sourcesanspro/v21/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rAkw.woff"
curl -L -o public/fonts/SourceSansPro-SemiBold.ttf "https://fonts.gstatic.com/s/sourcesanspro/v21/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rAkB.ttf"

echo "Font files downloaded successfully!" 