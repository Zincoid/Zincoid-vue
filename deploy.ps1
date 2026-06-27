$ErrorActionPreference = "Stop"

$SERVER   = "zn-server"
$WORK_DIR = "/usr/share/nginx/zincoid"
$TAR_NAME = "dist.tar.gz"
$SSH_OPTS = "-o StrictHostKeyChecking=accept-new"

function Exec {
    param([string]$Command)
    Write-Host "> $Command" -ForegroundColor DarkGray
    Invoke-Expression $Command
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Command failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Write-Host "[ === Nginx Deployment === ]" -ForegroundColor Cyan

Write-Host "[ === [1/7] Building === ]" -ForegroundColor Cyan
Exec "npm run build"

Write-Host "[ === [2/7] Packing $TAR_NAME === ]" -ForegroundColor Cyan
Exec "tar -czvf $TAR_NAME dist"

Write-Host "[ === [3/7] Uploading to $SERVER`:$WORK_DIR === ]" -ForegroundColor Cyan
Exec "scp $SSH_OPTS $TAR_NAME ${SERVER}:${WORK_DIR}"

Write-Host "[ === [4/7] Removing old dist on server === ]" -ForegroundColor Red
Exec "ssh $SSH_OPTS $SERVER rm -rf $WORK_DIR/dist"

Write-Host "[ === [5/7] Extracting on server === ]" -ForegroundColor Cyan
Exec "ssh $SSH_OPTS $SERVER tar -xzvf $WORK_DIR/$TAR_NAME -C $WORK_DIR"

Write-Host "[ === [6/7] Reloading nginx === ]" -ForegroundColor Cyan
Exec "ssh $SSH_OPTS $SERVER nginx -s reload"

Write-Host "[ === [7/7] Removing local $TAR_NAME === ]" -ForegroundColor Red
Exec "rm $TAR_NAME"

Write-Host "[ === Nginx Deployment Done === ]" -ForegroundColor Green
