import { Octokit } from "octokit"

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.REPO;
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
    const response = await octokit.request('GET /repos/{repo}/pulls/{issue_number}/reviews', {
      repo: REPO,
      issue_number: ISSUE_ID,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    return response.data;
}

async function addLabelToPR(label) {
    const response = await octokit.request('POST /repos/{repo}/issues/{issue_number}/labels', {
      repo: REPO,
      issue_number: ISSUE_ID,
      labels: [label],
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    return response.data;
}

async function getLabelFromPR() {
  const response = await octokit.request('GET /repos/{repo}/issues/{issue_number}/labels', {
    repo: REPO,
    issue_number: ISSUE_ID,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
  return response.data.map(label => label.name);
}

async function removeLabelFromPR(label) {
    const response = await octokit.request('DELETE /repos/{repo}/issues/{issue_number}/labels/{label}', {
      repo: REPO,
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
