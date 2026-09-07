/** Digital Hub receiver. Configure SPREADSHEET_ID and WEBHOOK_SECRET in Script Properties.
 * Deploy as Web app, execute as the owner. The public endpoint accepts signed writes only.
 * GET never reads or exposes student data. No student data is logged.
 */
function doGet() { return response_({ok:false,code:'POST_REQUIRED'}); }
function doPost(e) {
  let lock;
  try {
    const content=e&&e.postData&&e.postData.contents;
    if(!content||content.length>40000)return response_({ok:false,code:'BAD_REQUEST'});
    const props=PropertiesService.getScriptProperties();
    const secret=props.getProperty('WEBHOOK_SECRET');
    const spreadsheetId=props.getProperty('SPREADSHEET_ID');
    if(!secret||secret.length<32||!spreadsheetId)return response_({ok:false,code:'NOT_CONFIGURED'});
    const envelope=JSON.parse(content);
    if(typeof envelope.payload!=='string'||typeof envelope.signature!=='string')return response_({ok:false,code:'UNAUTHORIZED'});
    const bytes=Utilities.computeHmacSha256Signature(envelope.payload,secret,Utilities.Charset.UTF_8);
    const expected=bytes.map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
    if(!equal_(expected,envelope.signature))return response_({ok:false,code:'UNAUTHORIZED'});
    const data=JSON.parse(envelope.payload);
    if(!Number.isFinite(data.signedAt)||Math.abs(Date.now()-data.signedAt)>300000)return response_({ok:false,code:'EXPIRED'});
    if(data.version!=='digital-hub-2'||!Array.isArray(data.row)||!Array.isArray(data.headers)||data.row.length!==data.headers.length||data.row.length!==55||data.row[0]!==data.submissionId||data.row[1]!==data.hash||!/^[0-9a-f-]{36}$/.test(data.submissionId)||!/^[0-9a-f]{64}$/.test(data.hash))return response_({ok:false,code:'BAD_REQUEST'});
    if(data.row.some(function(v){return !['string','number'].includes(typeof v)||String(v).length>5000;}))return response_({ok:false,code:'BAD_REQUEST'});
    lock=LockService.getScriptLock();
    if(!lock.tryLock(10000))return response_({ok:false,code:'BUSY'});
    const book=SpreadsheetApp.openById(spreadsheetId);
    const sheetName='Результаты Digital Hub';
    let sheet=book.getSheetByName(sheetName);
    if(!sheet){sheet=book.insertSheet(sheetName);}
    if(sheet.getMaxColumns()<data.headers.length)sheet.insertColumnsAfter(sheet.getMaxColumns(),data.headers.length-sheet.getMaxColumns());
    if(sheet.getLastRow()===0){
      sheet.getRange(1,1,1,data.headers.length).setValues([data.headers.map(safeCell_)]).setBackground('#203e32').setFontColor('#ffffff').setFontWeight('bold').setWrap(true);
      sheet.setFrozenRows(1);sheet.setColumnWidths(1,data.headers.length,180);sheet.setColumnWidth(5,230);sheet.setColumnWidth(7,240);sheet.setRowHeight(1,72);
    }else if(JSON.stringify(sheet.getRange(1,1,1,data.headers.length).getValues()[0])!==JSON.stringify(data.headers))return response_({ok:false,code:'SCHEMA_MISMATCH'});
    if(sheet.getLastRow()>1){
      const existing=sheet.getRange(2,1,sheet.getLastRow()-1,1).createTextFinder(data.submissionId).matchEntireCell(true).findNext();
      if(existing){
        if(sheet.getRange(existing.getRow(),2).getValue()!==data.hash)return response_({ok:false,code:'ID_CONFLICT'});
        return response_({ok:true,submissionId:data.submissionId,duplicate:true});
      }
    }
    // Bound accepted writes per minute across all Vercel instances. Does not store IPs.
    const cache=CacheService.getScriptCache();const bucket='writes:'+Math.floor(Date.now()/60000);
    const writes=Number(cache.get(bucket)||0);if(writes>=60)return response_({ok:false,code:'BUSY'});
    cache.put(bucket,String(writes+1),120);
    sheet.appendRow(data.row.map(safeCell_));
    SpreadsheetApp.flush();
    return response_({ok:true,submissionId:data.submissionId});
  }catch(_error){return response_({ok:false,code:'WRITE_FAILED'});}
  finally{if(lock&&lock.hasLock())lock.releaseLock();}
}
function safeCell_(value){return typeof value==='string'&&/^[\s]*[=+\-@]/.test(value)?"'"+value:value;}
function equal_(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function response_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
