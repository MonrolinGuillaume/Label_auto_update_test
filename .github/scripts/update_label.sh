#!/bin/bash

set -e

GITHUB_TOKEN=${GITHUB_TOKEN}
REPO_OWNER=${REPO_OWNER}
REPO_NAME=${REPO_NAME}
ISSUE_ID=${ISSUE_ID}
EVENT_TYPE=${GITHUB_EVENT_ACTION}
LABEL_REVIEW_REQUESTED=':eyes: Review requested :eyes:'
LABEL_APPROVED=':rocket: Approved :rocket:'

headers=(
  -H "Authorization: token ${GITHUB_TOKEN}"
  -H "Accept: application/vnd.github.v3+json"
  -H "X-GitHub-Api-Version: 2022-11-28"
)

get_reviews_for_pr() {
  curl "${headers[@]}" \
    "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${ISSUE_ID}/reviews"
}

add_label_to_pr() {
  local label=$1
  curl -X POST "${headers[@]}" \
    -d "{\"labels\":[\"${label}\"]}" \
    "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_ID}/labels"
}

get_labels_from_pr() {
  curl "${headers[@]}" \
    "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_ID}/labels"
}

remove_label_from_pr() {
  local label=$1
  curl -X DELETE "${headers[@]}" \
    "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${ISSUE_ID}/labels/${label}"
}

check_for_at_least_two_approval() {
  local reviews=$1
  local approval_count=$(echo "${reviews}" | jq '[.[] | select(.state=="APPROVED")] | length')
  [[ ${approval_count} -ge 1 ]]
}

put_approved_label() {
  local current_labels=$1
  if echo "${current_labels}" | jq -e '.[] | select(.name=="'${LABEL_REVIEW_REQUESTED}'")' > /dev/null; then
    remove_label_from_pr "${LABEL_REVIEW_REQUESTED}"
  fi
  if ! echo "${current_labels}" | jq -e '.[] | select(.name=="'${LABEL_APPROVED}'")' > /dev/null; then
    add_label_to_pr "${LABEL_APPROVED}"
  fi
}

put_review_requested_label() {
  local current_labels=$1
  if echo "${current_labels}" | jq -e '.[] | select(.name=="'${LABEL_APPROVED}'")' > /dev/null; then
    remove_label_from_pr "${LABEL_APPROVED}"
  fi
  if ! echo "${current_labels}" | jq -e '.[] | select(.name=="'${LABEL_REVIEW_REQUESTED}'")' > /dev/null; then
    add_label_to_pr "${LABEL_REVIEW_REQUESTED}"
  fi
}

process_pull_requests() {
  local reviews=$(get_reviews_for_pr)
  local current_labels=$(get_labels_from_pr)

  if [ "${EVENT_TYPE}" == "synchronize" ]; then
    put_review_requested_label "${current_labels}"
  else
    if check_for_at_least_two_approval "${reviews}"; then
      put_approved_label "${current_labels}"
    else
      put_review_requested_label "${current_labels}"
    fi
  fi
}

echo $PWD
process_pull_requests
