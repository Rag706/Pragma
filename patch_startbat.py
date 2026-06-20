path = "c:\\git\\010_claude_work\\014_todo_application\\start.bat"

with open(path, "rb") as f:
    data = f.read()

content = data.decode("ascii")

content = content.replace(
    'start "TaskFlow - Backend" cmd /k',
    'start "TaskFlow - Backend" /min cmd /k'
).replace(
    'start "TaskFlow - Frontend" cmd /k',
    'start "TaskFlow - Frontend" /min cmd /k'
)

with open(path, "wb") as f:
    f.write(content.encode("ascii"))

print("Done.")
