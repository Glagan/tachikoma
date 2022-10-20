# tachikoma

**tachikoma** is an extension that sync your reading progress to multiple services while you read manga on multiple sites !  
You should never update manually again.

> **tachikoma** is still in beta and has missing features, expect bugs if you try using it and check the roadmap to see the progress.

## Sites

|                       Site                        |                             Link                              |
| :-----------------------------------------------: | :-----------------------------------------------------------: |
|  ![MangaDex Icon](static/icons/md.png) MangaDex   |             [mangadex.org](https://mangadex.org/)             |
| ![MangaPlus Icon](static/icons/mps.png) MangaPlus | [mangaplus.shueisha.co.jp](https://mangaplus.shueisha.co.jp/) |

Your favorite site is missing ? Check that it's not already requested and [request it](https://github.com/Glagan/tachikoma/issues/new?template=site-request.md&title=%5BSite%5D)

## Services

You can enable multiple services at the same time, and it will sync all of them to the same progress, with the informations they support.

|                         Site                          |                    Link                     |  Features   |
| :---------------------------------------------------: | :-----------------------------------------: | :---------: |
| ![MyAnimeList Icon](static/icons/mal.png) MyAnimeList | [myanimelist.net](https://myanimelist.net/) |             |
|     ![Anilist Icon](static/icons/al.png) Anilist      |      [anilist.co](https://anilist.co/)      |             |
|       ![Kitsu Icon](static/icons/ku.png) Kitsu        |        [kitsu.io](https://kitsu.io/)        |             |
|    ![MangaDex Icon](static/icons/md.png) MangaDex     |    [mangadex.org](https://mangadex.org/)    | Status only |

Your favorite service is missing ? Check that it's not already requested and [request it](https://github.com/Glagan/tachikoma/issues/new?template=service-request.md&title=%5BService%5D)

## Features

* Sync titles between all enabled services
* Automatically set the start and end date you start and finish a title
* Configurable highlight in lists to filter the chapters you already read and see the next chapter
* Title Editor to manually update a title

## Roadmap

**tachikoma** aim to have most of the features from the previous **SyncDex**, dropping unused or now not needed features.  
Here is some features that **will** be added to **tachikoma**, with no particular order of priority:

* Services Import/Export
* Automatic import on startup
* Last chapter detection and automatically set end date

There is also some features that are currently in **tachikoma** but incomplete or in progress and that will be updated:

* Options are not applied on the current page until a refresh
* Enhance the Title Editor

## Support

If you have a bug, open an issue, but if you want to send me a message, you can find me on the MangaDex Discord Server, under the same username, or maybe send me a message on [**Reddit**](https://www.reddit.com/message/compose?to=Glagan&subject=tachikoma&message=).

## Build

The only requirement is [**node**](https://nodejs.org/).

You first need to build the build plugins:

```bash
cd config
yarn install
yarn build
```

Then you can build **tachikoma** itself:

```bash
yarn install # at the root of the folder
# Building to contribute ?
yarn dev
# Building for both chrome and firefox
yarn build
# or *only* for chrome/firefox
yarn build:firefox
yarn build:chrome
```
