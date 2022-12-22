
## Decide what image to use

### Use prebuilt image
Prebuilt images are stored in:
```
skypigr/bundler
```

### Build the docker image locally
You build docker image locally by:
```
cd bundler/
./dbuild.sh
```

## Bring up the bundler server
You can bring up the service either using `docker compose` or using a `docker run` command directly.

## Use docker-compose

```
docker compose up
```

Note:
1. The compose file will attach a *volume* to the image, which will overwrite its default setting.

   * local dir: *./bundler/workdir*
   * image dir: */app/workdir*

   Before running the following command to bring up the container, you will need to put a `mnemonic.txt` file inside `./bundler/workdir`, which contains a list words that will be used to create a wallet that the bundler server will use to sign bundled transactions.
2. By default the compse use a specific prebuilt image, if you want to use locally built image, you need to build the image first and update the docker-compose.yml file accordingly.


## Start the container directly
The docker image already contains a [default](bundler/workdir/bundler.config.json) config file which provides most parameters needed except the `mnemonic`. You can create a mnemonic file like we do above and put it under `./bundler/workdir`, or you can also directly pass the mnemonic **words** through docker `-e` (environment) argument, for example:
```
cd bundler
docker run -p 3000:3000 -e BUNDLER_MNEMONIC="a valid mnemonic word list" $(docker build -q .)
```
Note: the mnemonic words need to follow a specific rule to be valid, here is an example:
```
test test test test test test test test test test test junk
```
