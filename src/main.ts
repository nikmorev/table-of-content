import './style.css'

initToc()

function initToc() {
    const originalToc = document.querySelector('.toc') as HTMLElement
    const tocCopy = originalToc.cloneNode(true) as HTMLElement
    tocCopy.classList.add('toc--aside')
    document.body.append(tocCopy)

    init(originalToc)
    init(tocCopy, true)
    switchTOCsInView(originalToc, tocCopy)
}

function getHeaderOffset() {
    return document.querySelector('header')!.offsetHeight
}

function switchTOCsInView(basicTOC: HTMLElement, asideTOC: HTMLElement) {
    let timerId: ReturnType<typeof setTimeout> | null
    const headerOffset = getHeaderOffset()

    function switcher() {
        if (timerId) return

        timerId = setTimeout(() => {
            if (timerId) clearTimeout(timerId)
            timerId = null
            const basicTOCBottom = basicTOC.getBoundingClientRect().bottom
            console.log(basicTOCBottom)
            asideTOC.hidden = basicTOCBottom >= headerOffset
        }, 200)
    }

    switcher()
    window.addEventListener('scroll', switcher)
}

function init(tocElement: HTMLElement, isAside=false) {

    const toc = tocElement
    const articles = Array.from(document.querySelectorAll('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]')) as HTMLElement[]
    const tocList = toc.querySelector('ol')!
    const tocToggler = toc.querySelector('.toc__toggler') as HTMLElement

    let postScrollTimerId: ReturnType<typeof setTimeout>
    const headerOffset = getHeaderOffset()
    const viewHeight = window.innerHeight
    const tocTogglerHeight = tocToggler.offsetHeight + 16

    const ACTIVE = 'active'

    initObservation()
    actualizeCurrentArticle()

    initListeners()

    if (isAside) watchMedia('(max-width: 80rem)', toggleMobileMode)


    function initObservation() {
        const options = {
            root: null,
            rootMargin: `-${headerOffset}px 0px -${viewHeight-headerOffset-20}px 0px`,
            threshold: 0,
        }

        const observer = new IntersectionObserver(observerCallback, options)
        setTimeout(() => articles.forEach(article => observer.observe(article)), 100)
    }

    function observerCallback(entries: IntersectionObserverEntry[], _observer: IntersectionObserver) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return
            const targetId = entry.target.id
            setActive(targetId)
            actualizeCurrentArticle()
        })
    }

    function getActiveLI(): HTMLLIElement {
        return toc.querySelector(`.${ACTIVE}`)!
    }

    function resetActive() {
        const li = getActiveLI()
        if (!li) return

        li.classList.remove(ACTIVE)

        const anchor = li.querySelector('[aria-current="true"]') as HTMLAnchorElement
        anchor.removeAttribute('aria-current')
        anchor.style.setProperty('--active-pre-size', '0')
    }

    function setActive(articleInViewId: string) {
        resetActive()

        const anchor = toc.querySelector(`[href="#${articleInViewId}"]`) as HTMLAnchorElement
        const li = anchor.closest('li')!

        li.classList.add(ACTIVE)
        anchor.setAttribute('aria-current', 'true')

        const activeLinkSize = anchor.offsetHeight
        anchor.style.setProperty('--active-pre-size', `${activeLinkSize}px`)

        let activeLinkOffset = li.offsetTop - tocTogglerHeight
        const tocViewAreaHeight = toc.clientHeight - tocTogglerHeight

        if (activeLinkOffset > tocViewAreaHeight) {
            activeLinkOffset -= (activeLinkOffset - tocViewAreaHeight)
            toc.scroll({top: activeLinkOffset, behavior: 'smooth'})
        } else if (activeLinkOffset < toc.scrollTop) {
            toc.scroll({top: activeLinkOffset, behavior: 'smooth'})
        }
    }

    function scrollArticleIntoViewHandler(event: Event) {
        event.preventDefault()

        const link = event.target as HTMLAnchorElement
        if (link.nodeName !== 'A') return

        const id = link.getAttribute('href')!
        const article = document.querySelector(id) as HTMLElement
        if (!article) return

        const headerOffset = getHeaderOffset()
        window.scroll({
            top: article.offsetTop - headerOffset,
            behavior: 'smooth'
        })

        toggleToc()
    }

    function actualizeCurrentArticle(withDelay=300) {
        if (postScrollTimerId) clearTimeout(postScrollTimerId)

        postScrollTimerId = setTimeout(() => {
            let minDiff = Infinity
            let articleInView: HTMLElement | null = null

            const headerOffset = getHeaderOffset()
            articles.forEach(article => {
                const diff = Math.abs(headerOffset - Math.abs(article.getBoundingClientRect().top - 20))
                if (minDiff < diff) return
                minDiff = diff
                articleInView = article
            })

            if (!articleInView) articleInView = articles[0]
            setActive(articleInView.id)
        }, withDelay)
    }

    function initListeners() {
        // for general and aside TOCs
        toc.addEventListener('click', scrollArticleIntoViewHandler)

        if (!isAside) return
        // for aside toc only
        tocToggler.addEventListener('click', toggleToc)
    }

    function toggleToc() {
        if (!toc.classList.contains('toc--mobile')) return

        const isShown = !tocList.hidden
        tocList.hidden = isShown
        toc.classList.toggle('toc--open', !isShown)
        tocToggler.setAttribute('aria-expanded', String(!isShown))
        const currentLink = toc.querySelector('[aria-current="true"]') as HTMLAnchorElement

        const activeLinkSize = currentLink.offsetHeight
        currentLink.style.setProperty('--active-pre-size', `${activeLinkSize}px`)

        document.body.style.overflow = isShown ? '' : 'hidden'
    }

    function toggleMobileMode(isMobile: boolean) {

        if (isMobile) {
            tocToggler.setAttribute('role', 'button')
            tocToggler.setAttribute('tabindex', '0')
            tocList.hidden = true
        } else {
            tocToggler.removeAttribute('role')
            tocToggler.removeAttribute('tabindex')
            tocList.hidden = false
        }
        toc.classList.toggle('toc--mobile', isMobile)
    }
}

function watchMedia(query: string, cb: (matches: boolean) => void) {
    const mql = window.matchMedia(query)

    if (mql.matches) cb(true)
    if (mql.addListener) return mql.addListener((e) => cb(e.matches))
    mql.addEventListener('change', (e) => cb(e.matches))
}

