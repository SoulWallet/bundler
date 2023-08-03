ENV=$1

# Define the file name based on the input variable
FILENAME=".local/${ENV}.env"

# If the file exists, export all variables to the global shell
if [ -f "$FILENAME" ]; then
    echo "Loading ${ENV}.env"
    export $(grep -v '^#' "$FILENAME" | xargs)
else
    echo "File ${FILENAME} does not exist."
fi
