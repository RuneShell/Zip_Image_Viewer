# Personal Project 2: ZIV (Zip Image Viewer)

### A lightweight, portable local book reader that runs in a web browser for ZIP, IMG, (and EPUB, PDF) files.
If your book is zipped, it will recursively unzip and extract the inner files.


![Image](https://github.com/user-attachments/assets/b11863aa-690f-4619-a788-86a9b86667ed)


### How to use:
- HTML Preview

1.  Open **ZIV.html** in your local browser.
2.  Hover your mouse cursor over the right side of the page and Upload your files.
3.  Hover your mouse cursor over the left side of the page and Select your book.

## Support
**File Types**
- **zip**ped items  : .zip
- **image** : .jpg, .jpeg, .png, .gif
- **epub** : .epub *(not implemented yet)*
- **pdf** : .pdf *(not implemented yet)*

**View Mode**
- Single page mode
	- rotation *(not implemented yet)*
	- zoom *(not implemented yet)*
	- move (translation) *(not implemented yet)*
- Double page mode
	- add-fitting-page (insert an empty page in front of page 1 for your double-sided page alignment)
	- reverse-view (display the book from right to left like manga)
- Scroll View mode (webtoon-style like manhwa)
	- change background color (white ↔  transparent)
- Fullscreen

**Recommended Environment**
Chrome / Firefox
Desktop Moniter with FHD(1080x1920 px) / QHD(1440x2560) resolution


## Others
**Future Update Ideas**
- support additional file type: EPUB, PDF (using foliate-js requires localhost..)
- ban upload new files while uploading
- if file is too big, do not load whole inner files
- **Feedback welcome:** Please report bugs, ideas, or technical advice (but will be update 'someday')

**Libraries Used**
- [zip.js (BSD-3-Clause License)](https://github.com/gildas-lormeau/zip.js) - Copyright (c) 2023, Gildas Lormeau

**Runeshell**
v 1.3.**-1** - not completed
Thank you for your interest!

**History**
v 1.0 : prototype
v 1.1 : fully rebuild GUI
v 1.2 : added features, clean some core codes 
v 1.3 : refactorizing full repo with clean code, feature, and clean structure.