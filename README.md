# Telegram messages parser
Chrome extension for parsing messages in web version of telegram

# Limitations
This is a very early version, so there could be some bugs and not every function is working properly.

Also there are several limitations (would be added in next version):
1. This version works only with web telegram k (https://web.telegram.org/k/)
2. Download button can be pressed multiple times in order to save parsed files for each chat sequentially
3. This version can't save photos and some other important data about messages (for example reply message id and etc)
4. It's crucial to start parsing process while being on any page except chats that would be parsed

# Result format
This extension uses json format for saving parsed messages.
Example of parsed chat with a single message:
[Json template file](template.json)

# TODO
[ ] 1. Add support for messages with images
[ ] 2. Add different versions of telegram website
[ ] 3. Change download button's behavior
[ ] 4. Test and improve batch option
[ ] 5. Change icon
[ ] 6. Refactor code
