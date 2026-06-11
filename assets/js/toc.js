/*
    Scrollspy for table of contents.
    Activates heading based on scroll position and TOC click.
*/

window.addEventListener('DOMContentLoaded', () => {
    const tocNav = document.querySelector("nav[id='TableOfContents']");
    if (!tocNav) return;

    const contents = document.getElementById("contents");
    if (contents) {
        contents.innerHTML = "Contents";
    }

    const scrollContainer = document.querySelector(".container.content");
    if (!scrollContainer) return;

    const post = document.querySelector(".post");
    if (!post) return;

    const headings = Array.from(
        post.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]")
    );
    if (headings.length === 0) return;

    let clickedId = null;
    let clickTimer = null;

    function setActive(id) {
        tocNav.querySelectorAll("li").forEach(node => {
            node.classList.add('inactive');
            node.classList.remove('active');
        });
        if (id) {
            const link = tocNav.querySelector(`li a[href="#${id}"]`);
            if (link) {
                link.parentElement.classList.replace('inactive', 'active');
            }
        }
    }

    function scrollUpdate() {
        if (clickedId) return;

        const containerTop = scrollContainer.getBoundingClientRect().top;
        const containerHeight = scrollContainer.clientHeight;
        const maxScroll = scrollContainer.scrollHeight - containerHeight;

        // Dynamic threshold: 100px from top when at the top, expanding to
        // full container height as you scroll to the bottom. This ensures
        // headings near the end are reachable even when there isn't enough
        // content below them to scroll them to the top.
        var scrollRatio = maxScroll > 0 ? scrollContainer.scrollTop / maxScroll : 0;
        var threshold = containerTop + 100 + (containerHeight - 100) * scrollRatio;

        // Find the last heading above the threshold
        let activeId = headings[0].getAttribute('id');
        for (const heading of headings) {
            if (heading.getBoundingClientRect().top <= threshold) {
                activeId = heading.getAttribute('id');
            }
        }

        setActive(activeId);
    }

    tocNav.querySelectorAll("a[href^='#']").forEach(link => {
        link.addEventListener('click', () => {
            const id = link.getAttribute('href').slice(1);
            clickedId = id;
            setActive(id);

            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => { clickedId = null; }, 500);
        });
    });

    scrollContainer.addEventListener('scroll', scrollUpdate, { passive: true });
    scrollUpdate();
});
