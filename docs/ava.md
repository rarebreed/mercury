# Notes on getting this working with AVA

Getting the react test to work was a bit tricky.  There were several things that had to be all lined up:

- get rid os css import
- Setup package.json for ava config
- Setup and inject enzyme adapter
- Inject a jsdom environment
- Cant return rxjs Observable for test in ava
- Cant do Observable.toPromise in typescript