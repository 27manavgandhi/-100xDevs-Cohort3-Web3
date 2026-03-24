#!/bin/bash
# Lecture Code - 1_tss_workflow.sh
# Complete TSS workflow for 2-party signing
# Day 31.1 - Private Key Management

set -e

echo "=== Solana TSS (Threshold Signature Scheme) Workflow ==="
echo ""
echo "This script demonstrates a 2-of-2 TSS signing process."
echo "Both parties must participate to create a valid signature."
echo ""

# Step 1: Generate key shares for both parties
echo "Step 1: Generating key shares..."
cargo run generate > /tmp/party1.txt
cargo run generate > /tmp/party2.txt

PARTY1_SECRET=$(grep "secret share:" /tmp/party1.txt | awk '{print $3}')
PARTY1_PUBLIC=$(grep "public share:" /tmp/party1.txt | awk '{print $3}')
PARTY2_SECRET=$(grep "secret share:" /tmp/party2.txt | awk '{print $3}')
PARTY2_PUBLIC=$(grep "public share:" /tmp/party2.txt | awk '{print $3}')

echo "✓ Party 1 Public: $PARTY1_PUBLIC"
echo "✓ Party 2 Public: $PARTY2_PUBLIC"
echo ""

# Step 2: Aggregate public keys
echo "Step 2: Aggregating public keys..."
AGGREGATE_KEY=$(cargo run aggregate-keys $PARTY1_PUBLIC $PARTY2_PUBLIC | grep "Aggregate key" | awk '{print $3}')
echo "✓ Aggregated Public Key: $AGGREGATE_KEY"
echo ""

# Step 3: Fund the aggregated address (requires manual action)
echo "Step 3: Fund the aggregated address"
echo "Run: solana airdrop 1 $AGGREGATE_KEY --url devnet"
echo "Press Enter when funded..."
read

# Step 4: Get recent blockhash
echo "Step 4: Getting recent blockhash..."
BLOCKHASH=$(cargo run recent-block-hash | grep "recent block hash:" | awk '{print $4}')
echo "✓ Recent Blockhash: $BLOCKHASH"
echo ""

# Step 5: Party 1 creates first message
echo "Step 5: Party 1 creating first message..."
cargo run agg-send-step-one $PARTY1_SECRET > /tmp/party1_step1.txt
MESSAGE_1=$(grep "Message 1:" /tmp/party1_step1.txt | awk '{print $3}')
SECRET_STATE_1=$(grep "Secret state:" /tmp/party1_step1.txt | awk '{print $3}')
echo "✓ Party 1 message created"
echo ""

# Step 6: Party 2 creates first message
echo "Step 6: Party 2 creating first message..."
cargo run agg-send-step-one $PARTY2_SECRET > /tmp/party2_step1.txt
MESSAGE_2=$(grep "Message 1:" /tmp/party2_step1.txt | awk '{print $3}')
SECRET_STATE_2=$(grep "Secret state:" /tmp/party2_step1.txt | awk '{print $3}')
echo "✓ Party 2 message created"
echo ""

# Destination address
DESTINATION="8XPovF32Ya1aJcoxbJLNrNGToRwvAQMzkTuQY81pk857"
AMOUNT="0.1"

# Step 7: Party 1 creates partial signature
echo "Step 7: Party 1 creating partial signature..."
cargo run agg-send-step-two \
  --keypair $PARTY1_SECRET \
  --amount $AMOUNT \
  --to $DESTINATION \
  --recent-block-hash $BLOCKHASH \
  --keys $PARTY1_PUBLIC $PARTY2_PUBLIC \
  --first-messages $MESSAGE_2 \
  --secret-state $SECRET_STATE_1 > /tmp/party1_sig.txt

SIG_1=$(grep "Partial signature:" /tmp/party1_sig.txt | awk '{print $3}')
echo "✓ Party 1 partial signature created"
echo ""

# Step 8: Party 2 creates partial signature
echo "Step 8: Party 2 creating partial signature..."
cargo run agg-send-step-two \
  --keypair $PARTY2_SECRET \
  --amount $AMOUNT \
  --to $DESTINATION \
  --recent-block-hash $BLOCKHASH \
  --keys $PARTY1_PUBLIC $PARTY2_PUBLIC \
  --first-messages $MESSAGE_1 \
  --secret-state $SECRET_STATE_2 > /tmp/party2_sig.txt

SIG_2=$(grep "Partial signature:" /tmp/party2_sig.txt | awk '{print $3}')
echo "✓ Party 2 partial signature created"
echo ""

# Step 9: Aggregate signatures and broadcast
echo "Step 9: Aggregating signatures and broadcasting..."
cargo run aggregate-signatures-and-broadcast \
  --signatures $SIG_1 $SIG_2 \
  --amount $AMOUNT \
  --to $DESTINATION \
  --recent-block-hash $BLOCKHASH \
  --net devnet \
  --keys $PARTY1_PUBLIC $PARTY2_PUBLIC

echo ""
echo "✓ Transaction broadcasted successfully!"
echo "Check on Solscan: https://solscan.io/address/$AGGREGATE_KEY?cluster=devnet"

# Cleanup
rm /tmp/party*.txt
