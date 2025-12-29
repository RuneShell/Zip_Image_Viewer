# Personal Project 2: ZIV (Zip Image Viewer)

### A lightweight, portable local book reader that runs in a web browser for ZIP, IMG, and EPUB files.
If your book is zipped, it will recursively unzip and extract the inner files.

I made this because the Windows built-in image viewer is not good for reading books(img).


![Image](https://github.com/user-attachments/assets/b11863aa-690f-4619-a788-86a9b86667ed)


### How to use:
- HTML Preview  : [ZIV.html](https://raw.githack.com/RuneShell/Zip_Image_Viewer/main/ZIV.html) *(sometimes unstable)*

- Local Usage : Open **ZIV.html** in your local browser.
>	1.  Hover your mouse cursor over the right side of the page and Upload your files.
>	2.  Hover your mouse cursor over the left side of the page and Select your book.

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
- iterate directories in zipped file
- **Feedback welcome:** Please report bugs, ideas, or technical advice (but will be update 'someday')

**Libraries Used**
- [jQuery (MIT License)](https://jquery.com)  - Copyright (c) jQuery Foundation
- [zip.js (BSD-3-Clause License)](https://github.com/gildas-lormeau/zip.js) - Copyright (c) 2023, Gildas Lormeau
- [epub.js (freeBSD License)](https://github.com/futurepress/epub.js) - Copyright (c) 2013, FuturePress

**Runeshell**
v 1.2.2
Thank you for your interest!