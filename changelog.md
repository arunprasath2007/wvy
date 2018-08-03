# Changelog for Weavy

## Weavy 1.1

With Weavy 1.1 it is now possible to add files from your cloud file providers such as Google Drive, Onedrive, Dropbox and Box. You can also create new Google drive from Weavy, never have to leave the context that you are working in.
Weavy 1.1 also gives you more possibilities how to connect a specific bubble to a web page url. You can choose between the domain (as in Weavy 1.0) or a specific path.
When creating posts, comments and new messages in the chat, we have now added a possibility to attach the current web page that you are working on as a context. This gives the reader of the post, comment or message a link to where the content actually was created.

### 1.1.0 (2018-08-03)

* Cloud file picker - Add links to files from Google Drive, Onedrive, Dropbox and Box.
* Added more options how to connect a specific bubble to an url.
* Added possibility to add the current url as a context to posts, comments and messages.
* Introduced a new collapsed mode for the widget bubbles.
* Fixed widget layout issues in IE.
* Fixed an issue in the setup wizard not storing the submitted details correctly.

### Upgrade instructions

1. Perform a full backup of your Weavy database and the files in your Weavy web site before applying the upgrade.
2. Verify that your server meets the [system requirements](http://docs.weavy.com/installation/on-prem#system-requirements).
3. Download and unzip the [upgrade package](http://files.weavy.com/releases/weavy-latest.zip).
4. Update the `web.config` file in the upgrade package with your custom settings, e.g. [database connection string](http://docs.weavy.com/developers/connection-string) and [authentication settings](http://docs.weavy.com/manual/manage/authentication-settings).
5. Delete all files and folders from your site except `App_Data`.
6. Copy all files from `wwwroot` in the upgrade package into the root folder of your site.
7. Run the `weavy.exe` command line tool to update the database. The `weavy.exe` program is located in the `bin` directory of your Weavy installation.

## Weavy 1.0

Initial release of Weavy.

### 1.0.1 (2018-05-15)

* Fixed an issue that prevented infinite scroll from working.
* Fixed an issue where the weavy widget ui was incorrectly scaled in IE/Edge.
* Fixed an issue that prevented scroll from working on high-dpi screens in Chrome.

### 1.0.0 (2018-05-02)
