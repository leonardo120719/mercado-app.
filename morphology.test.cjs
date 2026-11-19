const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const m=require('./morphology.js'),maps=JSON.parse(fs.readFileSync('morphology-codes.json')),samples=JSON.parse(fs.readFileSync('morphology-samples.json'));
test('actual corpus occurrences keep distinct grammar for the same Strong',()=>{
 const a=samples.records.find(r=>r.ref==='Jhn.15.4').rows.find(w=>w[3]==='G3306'),b=samples.records.find(r=>r.ref==='Jhn.15.5').rows.find(w=>w[3]==='G3306');
 assert.equal(a[4],'V-AAM-2P');assert.equal(b[4],'V-PAP-NSM');
 const first=Object.fromEntries(m.decode(a[4],'G',maps)[0].fields),second=Object.fromEntries(m.decode(b[4],'G',maps)[0].fields);
 assert.equal(first.Modo,'Imperativo');assert.equal(first.Pessoa,'2ª pessoa');assert.equal(first.Número,'Plural');assert.equal(first.Tempo,'Aoristo');
 assert.equal(second['Forma / flexão'],'Particípio');assert.equal(second.Caso,'Nominativo');assert.equal(second.Gênero,'Masculino');assert.equal(second.Número,'Singular');
});
test('Hebrew occurrence retains extended Strong, lemma, form and grammatical components',()=>{
 const row=samples.records.find(r=>r.ref==='Gen.1.1').rows.find(w=>w[3].includes('1254'));
 assert.deepEqual(m.strongs(row[3]),['H1254']);assert.equal(row[5],'בָּרָא');
 const data=Object.fromEntries(m.decode(row[4],'H',maps)[0].fields);
 assert.equal(data['Tronco verbal'],'Qal');assert.equal(data['Forma / flexão'],'Perfeito');assert.equal(data.Pessoa,'3ª pessoa');assert.equal(data.Gênero,'Masculino');
 const parts=m.decode('HR/Ncfsa','H',maps);assert.equal(parts.length,2);assert.equal(parts[1].code,'HNcfsa');assert.equal(Object.fromEntries(parts[1].fields).Classe,'Substantivo');
 assert.match(Object.fromEntries(parts[0].fields).Tempo,/Não se aplica/);
});
test('unknown codes remain unknown instead of inheriting morphology from a Strong number',()=>{
 const unknown=m.decode('V-UNKNOWN','G',maps)[0];assert.equal(unknown.description,'');assert.equal(Object.fromEntries(unknown.fields).Classe,'');
 assert.deepEqual(m.strongs('G03306/H01254A'),['G3306','H1254']);
});
test('TSV parsing keeps reference, sequence, variant metadata and multiple rows',async()=>{
 const lines=['Word & Type\tGreek\tEnglish','Jhn.15.4#01=NKO\tμείνατε (meinate)\tdo abide\tG3306=V-AAM-2P\tμένω=remain\tNA28+TR','Jhn.15.5#09=NKO\tμένων (menōn)\tabiding\tG3306=V-PAP-NSM\tμένω=remain\tNA28'];
 const result=await m.parseCorpus(lines.join('\n'),{id:'test'});assert.equal(result.count,2);assert.equal(result.records.length,2);assert.equal(result.records[0].rows[0][0],'Jhn.15.4#01=NKO');assert.equal(result.records[0].rows[0][2],'meinate');assert.ok(result.records[1].strongs.includes('G3306'));
 await assert.rejects(m.parseCorpus('<script>invalid</script>',{id:'test'}),/não contém/);
});
