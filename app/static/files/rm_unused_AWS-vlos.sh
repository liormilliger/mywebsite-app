#!/bin/bash
# Delete all AWS EBS volumes not in "in-use" state
# Requires: AWS CLI configured with appropriate permissions

set -e

echo "🔍 Fetching EBS volumes not in 'in-use' state..."
VOLUMES=$(aws ec2 describe-volumes \
  --query "Volumes[?State!='in-use'].VolumeId" \
  --output text)

if [ -z "$VOLUMES" ]; then
  echo "✅ No unused volumes found."
  exit 0
fi

echo "⚠️ The following volumes are NOT in use and may be deleted:"
echo "$VOLUMES" | tr '\t' '\n'
echo

read -p "Do you want to delete ALL of these volumes? (yes/no): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "❌ Aborted. No volumes deleted."
  exit 0
fi

echo "🗑️ Deleting volumes..."
for VOL in $VOLUMES; do
  echo "Deleting $VOL..."
  aws ec2 delete-volume --volume-id "$VOL"
done

echo "✅ All unused volumes deleted."