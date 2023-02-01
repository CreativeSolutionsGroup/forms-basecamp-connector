# Google Form > Basecamp tunnel

This repo has the code for a Cloudflare worker to connect a Google form and its responses to a Basecamp todo list.

Instructions for implementing this on a Google form are below.

1. There are three important parts of the Google form that must be included to ensure that the connector will work well. These must be named exactly as follows to ensure proper operation.
```
Title
Description
Date due
```
2. Once the form has been created, click on the three dots in the top right corner of the page, and then choose `Script Editor`.
3. After the script editor opens, click on the plus sign next to the `Libraries` label. Once the popup opens, enter `1aWGQVeuAeqOLbTP8yqv0wOn9Yvo7iDu2hHk8gTXgdWMXpQgd-83XGS9H` and click `Look Up`.
4. Click `Add` and you will be returned to the main window.
5. Copy and paste the following code into the editor.
```javascript
var POST_URL = "https://forms-basecamp-link.creativesolutions.workers.dev/"

function onSubmit(e) {
  FormsCloudflareLibrary.sendToCloudflare(POST_URL, FormApp.getActiveForm(), "<project_id>", "<list_id>");
}
```
6. Where there are angle brackets, enter the project and list IDs. These can be found in the URL after navigating to the list in Basecamp.
7. You should be all set!
