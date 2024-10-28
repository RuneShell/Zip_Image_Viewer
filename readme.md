# Personal Project 2: ZIV (Zip Image Viewer)

### A lightweight, portable local book reader that runs in a web browser for ZIP, IMG, and EPUB files.
If your book is zipped, it will recursively unzip and extract the inner files.

I made this because the Windows built-in image viewer is not good for reading books(img).


![image1](https://github.com/user-attachments/assets/8244392f-4575-44d6-a8cb-8bb2ccf9f9e0)


### How to use:

1.  Open **ZIV.html** in your local browser.
2.  Hover your mouse cursor over the right side of the page and Upload your files.
3.  Hover your mouse cursor over the left side of the page and Select your book.

## Support
**File Types**
- **zip**ped items  : .zip
- **image** : .jpg, .jpeg, .png, .gif
- **epub** : .epub

**View Mode**
- Single page mode
- Double page mode
	- add-fitting-page (insert an empty page in front of page 1 for your double-sided page alignment)
	- reverse-view (display the book from right to left like manga)
- Horizontal page mode: *still need some fixes*
- Scroll View mode (webtoon-style like manhwa)
- Fullscreen

**Recommended Environment**
Chrome / Firefox
PC with FHD (1080x1920 px) resolution


## Others
**Future Update Ideas**
- support additional file type: PDF
- fix for Horizontal page view mode
- rebuild structure: classify, encapsulation, clean code, etc
- ban upload new files while uploading
- if file is too big, do not load whole inner files
- **Feedback welcome:** Please report bugs, ideas, or technical advice (but will be update 'someday')

**Libraries Used**
- [jQuery (MIT License)](https://jquery.com)  - Copyright (c) jQuery Foundation
- [zip.js (BSD-3-Clause License)](https://github.com/gildas-lormeau/zip.js) - Copyright (c) 2023, Gildas Lormeau
- [epub.js (freeBSD License)](https://github.com/futurepress/epub.js) - Copyright (c) 2013, FuturePress

**Runeshell**
v 0.2.1
Thank you for your interest!
