#!/usr/bin/env bash
# Kevnova : génère toutes les images manquantes, 5 en parallèle.
cd "$(dirname "$0")"
python3 ecrire_prompts.py
ls prompts/*.txt | xargs -n1 basename | sed 's/\.txt$//' | grep -v '^_' | while read id; do
  [[ -f "out/$id.png" ]] || echo "$id"
done | xargs -P 6 -I{} ./generer.sh {}
echo TERMINE >> logs/etat.txt
