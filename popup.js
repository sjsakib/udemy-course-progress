async function collectProgress() {
  async function sleep(t) {
    return new Promise(resolve => setTimeout(resolve, t));
  }

  const openContentBtn = document.querySelector('[data-purpose="open-course-content"]');

  if (openContentBtn) {
    openContentBtn.click();
    await sleep(500);
  }

  const courseContentBtn = document.evaluate(
    "//button[@role='tab' and span[contains(text(), 'Course content')]]",
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );

  if (courseContentBtn?.singleNodeValue) {
    courseContentBtn.singleNodeValue.click();
    await sleep(500);
  }

  const headings = document.querySelectorAll('[data-purpose="section-heading"]');

  for (const heading of headings) {
    const expanded = heading.querySelector('[aria-expanded="true"]');

    if (!expanded) heading.click();
  }

  await sleep(500);

  const lectureEls = document.querySelectorAll('[data-purpose*="curriculum-item"]');

  let totalMin = 0;
  let completedMin = 0;
  for (const lectureEl of lectureEls) {
    let min =
      lectureEl.querySelector('[class*="curriculum-item-link--bottom"]')?.innerText ?? '';

    min = Number(min?.replace('min', ''));

    if (isNaN(min)) continue;

    totalMin += min;

    if (lectureEl.innerText.includes('completed')) {
      completedMin += min;
    }
  }

  return { totalMin, completedMin };
}

function formatMinutes(min) {
  const hour = Math.floor(min / 60)
    .toFixed(0)
    .padStart(2, '0');
  const minute = (min % 60).toFixed(0).padStart(2, '0');

  let result = [];
  if (hour > 0) {
    result.push(`${hour}h`);
  }
  result.push(`${minute}min`);

  return result.join(':');
}

async function main() {
  const [currentTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!currentTab.url.includes('udemy.com/course')) {
    document.querySelector('#message').innerText = 'Not Course Page';
    return;
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    func: collectProgress,
  });

  const { totalMin, completedMin } = result;

  if (isNaN(totalMin) || isNaN(completedMin)) {
    throw new Error('Failed to collect progress');
  }

  const percentage = ((completedMin / totalMin) * 100).toFixed(2);

  document.querySelector('#message').remove();

  const progressEl = document.querySelector('#progress');
  progressEl.style.display = 'block';
  progressEl.innerText = `${percentage}%`;

  const detailsEl = document.querySelector('#details');
  detailsEl.style.display = 'block';
  detailsEl.innerHTML =
    `${formatMinutes(completedMin)} / ${formatMinutes(totalMin)} <br />` +
    `1% ~ ${formatMinutes(totalMin / 100)} <br />`;
}

main().catch(() => {
  document.querySelector('#message').innerText = 'Something went wrong.';
});
