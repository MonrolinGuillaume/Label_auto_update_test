import { Octokit } from "octokit"

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_OWNER;
const ISSUE_ID = process.env.ISSUE_ID;
const LABEL_REVIEW_REQUESTED = 'review requested';
const LABEL_APPROVED = 'approved';


const octokit = new Octokit({
  auth: GITHUB_TOKEN
})

const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
};

async function getReviewsForPR() {
    const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{issue_number}/reviews', {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: ISSUE_ID,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    return response.data;
}

async function addLabelToPR(label) {
    const response = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: ISSUE_ID,
      labels: [label],
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    return response.data;
}

async function getLabelFromPR() {
  const response = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/labels', {
    owner: REPO_OWNER,
    repo: REPO_NAME,
    issue_number: ISSUE_ID,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
  return response.data.map(label => label.name);
}

async function removeLabelFromPR(label) {
    const response = await octokit.request('DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{label}', {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: ISSUE_ID,
      label: label,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    return response.data;
}

function checkForAtLeastTwoApproval(reviews) {
  return reviews.reduce((total,item) => total+(item.state==="APPROVED"), 0) >= 1
}

async function processPullRequests() {
      const reviews = await getReviewsForPR();
      const currentLabels = await getLabelFromPR();
      if (checkForAtLeastTwoApproval(reviews)) {
        if (currentLabels.includes(LABEL_REVIEW_REQUESTED)) {
          await removeLabelFromPR(LABEL_REVIEW_REQUESTED);
        }
        if (!currentLabels.includes(LABEL_APPROVED)) {
            await addLabelToPR(LABEL_APPROVED);
        }
      } else {
        if (currentLabels.includes(LABEL_APPROVED)) {
          await removeLabelFromPR(LABEL_APPROVED);
        }
        if (!currentLabels.includes(LABEL_REVIEW_REQUESTED)) {
            await addLabelToPR(LABEL_REVIEW_REQUESTED);
        }
      }
}

processPullRequests().catch(error => {
    console.error('Error processing pull requests:', error);
});
